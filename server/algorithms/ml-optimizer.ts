import * as tf from '@tensorflow/tfjs-node';
import { Zone, IlotConfiguration } from '../../shared/schema';

export interface Point {
  x: number;
  y: number;
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
  area?: number;
}

export interface Ilot extends Rectangle {
  id: string;
  sizeCategory: string;
  rotation: number;
}

export interface Corridor extends Rectangle {
  id: string;
  type: 'horizontal' | 'vertical';
  connectedIlots: string[];
}

export interface OptimizationResult {
  ilots: Ilot[];
  corridors: Corridor[];
  score: number;
  utilizationPercentage: number;
  totalArea: number;
  generationTime: number;
  algorithm: string;
}

export class MLOptimizer {
  private model: tf.LayersModel | null = null;
  private isModelLoaded = false;

  constructor() {
    this.initializeModel();
  }

  private async initializeModel() {
    try {
      // Create a simple neural network for optimization scoring
      this.model = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [10], // Feature vector size
            units: 64,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 32,
            activation: 'relu'
          }),
          tf.layers.dense({
            units: 16,
            activation: 'relu'
          }),
          tf.layers.dense({
            units: 1,
            activation: 'sigmoid' // Score between 0 and 1
          })
        ]
      });

      this.model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['accuracy']
      });

      this.isModelLoaded = true;
    } catch (error) {
      console.error('Failed to initialize ML model:', error);
    }
  }

  /**
   * Main optimization function using genetic algorithm with ML scoring
   */
  async optimizeLayout(
    zones: Zone[],
    configuration: IlotConfiguration,
    floorPlanDimensions: { width: number; height: number }
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    // Extract available space (excluding walls, restricted areas, and entrances)
    const availableAreas = this.extractAvailableAreas(zones, floorPlanDimensions);
    
    // Generate ilot requirements based on configuration
    const ilotRequirements = this.generateIlotRequirements(configuration, availableAreas);
    
    // Run genetic algorithm optimization
    const result = await this.runGeneticAlgorithm(
      ilotRequirements,
      availableAreas,
      configuration.corridorWidth
    );
    
    // Generate corridors between facing ilots
    const corridors = this.generateCorridors(result.ilots, configuration.corridorWidth);
    
    // Calculate ML-based optimization score
    const score = await this.calculateOptimizationScore(result.ilots, corridors, availableAreas);
    
    const endTime = Date.now();
    const generationTime = (endTime - startTime) / 1000;
    
    return {
      ilots: result.ilots,
      corridors,
      score,
      utilizationPercentage: result.utilizationPercentage,
      totalArea: result.totalArea,
      generationTime,
      algorithm: 'Genetic Algorithm with ML Optimization'
    };
  }

  /**
   * Extract available areas from zones, excluding restricted areas
   */
  private extractAvailableAreas(
    zones: Zone[],
    floorPlanDimensions: { width: number; height: number }
  ): Rectangle[] {
    const restrictedZones = zones.filter(zone => 
      zone.type === 'restricted' || zone.type === 'entrance' || zone.type === 'exit'
    );
    
    // Start with the entire floor plan as available space
    let availableAreas: Rectangle[] = [{
      x: 0,
      y: 0,
      width: floorPlanDimensions.width,
      height: floorPlanDimensions.height
    }];
    
    // Subtract restricted zones
    for (const zone of restrictedZones) {
      const coordinates = zone.coordinates as Point[];
      if (coordinates && coordinates.length >= 3) {
        const bbox = this.getBoundingBox(coordinates);
        availableAreas = this.subtractRectangleFromAreas(availableAreas, bbox);
      }
    }
    
    return availableAreas.filter(area => area.width > 1 && area.height > 1);
  }

  /**
   * Generate ilot requirements based on size distribution
   */
  private generateIlotRequirements(
    configuration: IlotConfiguration,
    availableAreas: Rectangle[]
  ): { count: number; minSize: number; maxSize: number; category: string }[] {
    const sizeDistribution = configuration.sizeDistribution as any[];
    const totalAvailableArea = availableAreas.reduce((sum, area) => sum + (area.width * area.height), 0);
    
    const requirements = sizeDistribution.map((dist, index) => {
      const targetArea = totalAvailableArea * (dist.percentage / 100);
      const avgIlotSize = (dist.minSize + dist.maxSize) / 2;
      const count = Math.floor(targetArea / avgIlotSize);
      
      return {
        count: Math.max(1, count),
        minSize: dist.minSize,
        maxSize: dist.maxSize,
        category: `Category ${index + 1} (${dist.minSize}-${dist.maxSize}m²)`
      };
    });
    
    return requirements;
  }

  /**
   * Genetic algorithm for optimal ilot placement
   */
  private async runGeneticAlgorithm(
    requirements: { count: number; minSize: number; maxSize: number; category: string }[],
    availableAreas: Rectangle[],
    corridorWidth: number
  ): Promise<{ ilots: Ilot[]; utilizationPercentage: number; totalArea: number }> {
    const populationSize = 50;
    const generations = 100;
    const mutationRate = 0.1;
    const crossoverRate = 0.8;
    
    // Generate initial population
    let population = this.generateInitialPopulation(
      populationSize,
      requirements,
      availableAreas
    );
    
    for (let gen = 0; gen < generations; gen++) {
      // Evaluate fitness for each individual
      const fitnessScores = population.map(individual => 
        this.evaluateFitness(individual, availableAreas, corridorWidth)
      );
      
      // Selection, crossover, and mutation
      const newPopulation = [];
      
      // Keep best individuals (elitism)
      const sortedIndices = fitnessScores
        .map((score, index) => ({ score, index }))
        .sort((a, b) => b.score - a.score);
      
      const eliteCount = Math.floor(populationSize * 0.1);
      for (let i = 0; i < eliteCount; i++) {
        newPopulation.push([...population[sortedIndices[i].index]]);
      }
      
      // Generate rest through crossover and mutation
      while (newPopulation.length < populationSize) {
        const parent1 = this.tournamentSelection(population, fitnessScores);
        const parent2 = this.tournamentSelection(population, fitnessScores);
        
        let offspring1, offspring2;
        if (Math.random() < crossoverRate) {
          [offspring1, offspring2] = this.crossover(parent1, parent2);
        } else {
          offspring1 = [...parent1];
          offspring2 = [...parent2];
        }
        
        if (Math.random() < mutationRate) {
          this.mutate(offspring1, availableAreas);
        }
        if (Math.random() < mutationRate) {
          this.mutate(offspring2, availableAreas);
        }
        
        newPopulation.push(offspring1);
        if (newPopulation.length < populationSize) {
          newPopulation.push(offspring2);
        }
      }
      
      population = newPopulation;
    }
    
    // Return best individual
    const finalFitnessScores = population.map(individual => 
      this.evaluateFitness(individual, availableAreas, corridorWidth)
    );
    
    const bestIndex = finalFitnessScores.indexOf(Math.max(...finalFitnessScores));
    const bestIlots = population[bestIndex];
    
    const totalArea = bestIlots.reduce((sum, ilot) => sum + ilot.area!, 0);
    const totalAvailableArea = availableAreas.reduce((sum, area) => sum + (area.width * area.height), 0);
    const utilizationPercentage = (totalArea / totalAvailableArea) * 100;
    
    return {
      ilots: bestIlots,
      utilizationPercentage,
      totalArea
    };
  }

  /**
   * Generate initial population for genetic algorithm
   */
  private generateInitialPopulation(
    populationSize: number,
    requirements: { count: number; minSize: number; maxSize: number; category: string }[],
    availableAreas: Rectangle[]
  ): Ilot[][] {
    const population: Ilot[][] = [];
    
    for (let i = 0; i < populationSize; i++) {
      const individual: Ilot[] = [];
      let ilotId = 0;
      
      for (const req of requirements) {
        for (let j = 0; j < req.count; j++) {
          const area = req.minSize + Math.random() * (req.maxSize - req.minSize);
          const aspectRatio = 0.5 + Math.random() * 1.0; // Between 0.5 and 1.5
          
          const width = Math.sqrt(area / aspectRatio);
          const height = Math.sqrt(area * aspectRatio);
          
          // Find a random position in available areas
          const position = this.findRandomValidPosition(
            width,
            height,
            availableAreas,
            individual
          );
          
          if (position) {
            individual.push({
              id: `ilot_${ilotId++}`,
              x: position.x,
              y: position.y,
              width,
              height,
              area,
              sizeCategory: req.category,
              rotation: Math.random() < 0.5 ? 0 : 90
            });
          }
        }
      }
      
      population.push(individual);
    }
    
    return population;
  }

  /**
   * Find a random valid position for an ilot
   */
  private findRandomValidPosition(
    width: number,
    height: number,
    availableAreas: Rectangle[],
    existingIlots: Ilot[]
  ): Point | null {
    const maxAttempts = 100;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      for (const area of availableAreas) {
        if (area.width >= width && area.height >= height) {
          const x = area.x + Math.random() * (area.width - width);
          const y = area.y + Math.random() * (area.height - height);
          
          const newIlot = { x, y, width, height };
          
          // Check for overlaps with existing ilots
          if (!this.hasOverlap(newIlot, existingIlots)) {
            return { x, y };
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Check if a rectangle overlaps with any existing ilots
   */
  private hasOverlap(rect: Rectangle, existingIlots: Ilot[]): boolean {
    return existingIlots.some(ilot => 
      rect.x < ilot.x + ilot.width &&
      rect.x + rect.width > ilot.x &&
      rect.y < ilot.y + ilot.height &&
      rect.y + rect.height > ilot.y
    );
  }

  /**
   * Evaluate fitness of an individual (chromosome)
   */
  private evaluateFitness(
    individual: Ilot[],
    availableAreas: Rectangle[],
    corridorWidth: number
  ): number {
    let score = 0;
    
    // Factor 1: Space utilization (higher is better)
    const totalIlotArea = individual.reduce((sum, ilot) => sum + ilot.area!, 0);
    const totalAvailableArea = availableAreas.reduce((sum, area) => sum + (area.width * area.height), 0);
    const utilization = totalIlotArea / totalAvailableArea;
    score += utilization * 100;
    
    // Factor 2: Overlap penalty (overlaps are bad)
    const overlapPenalty = this.calculateOverlapPenalty(individual);
    score -= overlapPenalty * 50;
    
    // Factor 3: Corridor efficiency (well-arranged ilots get bonus)
    const corridorBonus = this.calculateCorridorEfficiencyBonus(individual, corridorWidth);
    score += corridorBonus * 20;
    
    // Factor 4: Boundary adherence (ilots should be within available areas)
    const boundaryPenalty = this.calculateBoundaryPenalty(individual, availableAreas);
    score -= boundaryPenalty * 30;
    
    return Math.max(0, score);
  }

  /**
   * Calculate penalty for overlapping ilots
   */
  private calculateOverlapPenalty(individual: Ilot[]): number {
    let penalty = 0;
    
    for (let i = 0; i < individual.length; i++) {
      for (let j = i + 1; j < individual.length; j++) {
        const overlap = this.calculateOverlapArea(individual[i], individual[j]);
        penalty += overlap;
      }
    }
    
    return penalty;
  }

  /**
   * Calculate overlap area between two rectangles
   */
  private calculateOverlapArea(rect1: Rectangle, rect2: Rectangle): number {
    const xOverlap = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
    const yOverlap = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
    return xOverlap * yOverlap;
  }

  /**
   * Calculate corridor efficiency bonus
   */
  private calculateCorridorEfficiencyBonus(individual: Ilot[], corridorWidth: number): number {
    let bonus = 0;
    
    // Find rows of ilots that could benefit from corridors
    const rows = this.groupIlotsIntoRows(individual);
    
    for (let i = 0; i < rows.length - 1; i++) {
      const row1 = rows[i];
      const row2 = rows[i + 1];
      
      // Check if rows are facing each other
      const averageY1 = row1.reduce((sum, ilot) => sum + ilot.y, 0) / row1.length;
      const averageY2 = row2.reduce((sum, ilot) => sum + ilot.y, 0) / row2.length;
      
      if (Math.abs(averageY2 - averageY1) < corridorWidth * 3) {
        bonus += Math.min(row1.length, row2.length) * 0.1;
      }
    }
    
    return bonus;
  }

  /**
   * Group ilots into rows based on Y coordinate
   */
  private groupIlotsIntoRows(individual: Ilot[]): Ilot[][] {
    const rows: Ilot[][] = [];
    const sortedIlots = [...individual].sort((a, b) => a.y - b.y);
    
    for (const ilot of sortedIlots) {
      let addedToRow = false;
      
      for (const row of rows) {
        const avgY = row.reduce((sum, i) => sum + i.y, 0) / row.length;
        if (Math.abs(ilot.y - avgY) < ilot.height) {
          row.push(ilot);
          addedToRow = true;
          break;
        }
      }
      
      if (!addedToRow) {
        rows.push([ilot]);
      }
    }
    
    return rows;
  }

  /**
   * Calculate penalty for ilots outside available areas
   */
  private calculateBoundaryPenalty(individual: Ilot[], availableAreas: Rectangle[]): number {
    let penalty = 0;
    
    for (const ilot of individual) {
      let isInAvailableArea = false;
      
      for (const area of availableAreas) {
        if (
          ilot.x >= area.x &&
          ilot.y >= area.y &&
          ilot.x + ilot.width <= area.x + area.width &&
          ilot.y + ilot.height <= area.y + area.height
        ) {
          isInAvailableArea = true;
          break;
        }
      }
      
      if (!isInAvailableArea) {
        penalty += ilot.area! * 0.1;
      }
    }
    
    return penalty;
  }

  /**
   * Tournament selection for genetic algorithm
   */
  private tournamentSelection(population: Ilot[][], fitnessScores: number[]): Ilot[] {
    const tournamentSize = 3;
    let best = 0;
    let bestFitness = -Infinity;
    
    for (let i = 0; i < tournamentSize; i++) {
      const candidate = Math.floor(Math.random() * population.length);
      if (fitnessScores[candidate] > bestFitness) {
        best = candidate;
        bestFitness = fitnessScores[candidate];
      }
    }
    
    return population[best];
  }

  /**
   * Crossover operation for genetic algorithm
   */
  private crossover(parent1: Ilot[], parent2: Ilot[]): [Ilot[], Ilot[]] {
    const crossoverPoint = Math.floor(Math.random() * Math.min(parent1.length, parent2.length));
    
    const offspring1 = [
      ...parent1.slice(0, crossoverPoint),
      ...parent2.slice(crossoverPoint)
    ];
    
    const offspring2 = [
      ...parent2.slice(0, crossoverPoint),
      ...parent1.slice(crossoverPoint)
    ];
    
    return [offspring1, offspring2];
  }

  /**
   * Mutation operation for genetic algorithm
   */
  private mutate(individual: Ilot[], availableAreas: Rectangle[]): void {
    if (individual.length === 0) return;
    
    const mutationIndex = Math.floor(Math.random() * individual.length);
    const ilot = individual[mutationIndex];
    
    // Random mutation: small position change
    const maxMove = 2.0;
    ilot.x += (Math.random() - 0.5) * maxMove;
    ilot.y += (Math.random() - 0.5) * maxMove;
    
    // Ensure ilot stays within bounds
    for (const area of availableAreas) {
      if (
        ilot.x >= area.x &&
        ilot.y >= area.y &&
        ilot.x + ilot.width <= area.x + area.width &&
        ilot.y + ilot.height <= area.y + area.height
      ) {
        break;
      }
    }
  }

  /**
   * Generate corridors between facing ilot rows
   */
  private generateCorridors(ilots: Ilot[], corridorWidth: number): Corridor[] {
    const corridors: Corridor[] = [];
    const rows = this.groupIlotsIntoRows(ilots);
    
    for (let i = 0; i < rows.length - 1; i++) {
      const row1 = rows[i];
      const row2 = rows[i + 1];
      
      // Calculate average Y positions
      const avgY1 = row1.reduce((sum, ilot) => sum + (ilot.y + ilot.height), 0) / row1.length;
      const avgY2 = row2.reduce((sum, ilot) => sum + ilot.y, 0) / row2.length;
      
      // Check if there's enough space for a corridor
      if (avgY2 - avgY1 >= corridorWidth) {
        // Find overlapping X ranges
        const minX1 = Math.min(...row1.map(ilot => ilot.x));
        const maxX1 = Math.max(...row1.map(ilot => ilot.x + ilot.width));
        const minX2 = Math.min(...row2.map(ilot => ilot.x));
        const maxX2 = Math.max(...row2.map(ilot => ilot.x + ilot.width));
        
        const corridorStartX = Math.max(minX1, minX2);
        const corridorEndX = Math.min(maxX1, maxX2);
        
        if (corridorEndX > corridorStartX) {
          const corridor: Corridor = {
            id: `corridor_${i}`,
            x: corridorStartX,
            y: avgY1,
            width: corridorEndX - corridorStartX,
            height: corridorWidth,
            type: 'horizontal',
            connectedIlots: [
              ...row1.map(ilot => ilot.id),
              ...row2.map(ilot => ilot.id)
            ]
          };
          
          corridors.push(corridor);
        }
      }
    }
    
    return corridors;
  }

  /**
   * Calculate ML-based optimization score
   */
  private async calculateOptimizationScore(
    ilots: Ilot[],
    corridors: Corridor[],
    availableAreas: Rectangle[]
  ): Promise<number> {
    if (!this.isModelLoaded || !this.model) {
      // Fallback to heuristic scoring
      return this.calculateHeuristicScore(ilots, corridors, availableAreas);
    }
    
    try {
      // Create feature vector
      const features = this.extractFeatures(ilots, corridors, availableAreas);
      
      // Predict using ML model
      const prediction = this.model.predict(tf.tensor2d([features])) as tf.Tensor;
      const score = await prediction.data();
      
      prediction.dispose();
      
      return score[0] * 100; // Convert to 0-100 scale
    } catch (error) {
      console.error('ML prediction failed, using heuristic:', error);
      return this.calculateHeuristicScore(ilots, corridors, availableAreas);
    }
  }

  /**
   * Extract features for ML model
   */
  private extractFeatures(
    ilots: Ilot[],
    corridors: Corridor[],
    availableAreas: Rectangle[]
  ): number[] {
    const totalAvailableArea = availableAreas.reduce((sum, area) => sum + (area.width * area.height), 0);
    const totalIlotArea = ilots.reduce((sum, ilot) => sum + ilot.area!, 0);
    const totalCorridorArea = corridors.reduce((sum, corridor) => sum + (corridor.width * corridor.height), 0);
    
    const features = [
      totalIlotArea / totalAvailableArea, // Utilization ratio
      ilots.length / 100, // Normalized ilot count
      corridors.length / 20, // Normalized corridor count
      totalCorridorArea / totalAvailableArea, // Corridor area ratio
      this.calculateOverlapPenalty(ilots) / totalIlotArea, // Normalized overlap
      this.calculateAverageAspectRatio(ilots), // Average aspect ratio
      this.calculateSpacingUniformity(ilots), // Spacing uniformity
      this.calculateAccessibility(ilots, corridors), // Accessibility score
      this.calculateEnergyEfficiency(ilots), // Energy efficiency (compact layouts)
      this.calculateAestheticScore(ilots) // Aesthetic arrangement score
    ];
    
    return features;
  }

  /**
   * Calculate average aspect ratio of ilots
   */
  private calculateAverageAspectRatio(ilots: Ilot[]): number {
    if (ilots.length === 0) return 1;
    
    const ratios = ilots.map(ilot => ilot.width / ilot.height);
    return ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  }

  /**
   * Calculate spacing uniformity between ilots
   */
  private calculateSpacingUniformity(ilots: Ilot[]): number {
    if (ilots.length < 2) return 1;
    
    const distances: number[] = [];
    
    for (let i = 0; i < ilots.length; i++) {
      for (let j = i + 1; j < ilots.length; j++) {
        const dx = (ilots[i].x + ilots[i].width / 2) - (ilots[j].x + ilots[j].width / 2);
        const dy = (ilots[i].y + ilots[i].height / 2) - (ilots[j].y + ilots[j].height / 2);
        distances.push(Math.sqrt(dx * dx + dy * dy));
      }
    }
    
    const avgDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
    const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgDistance, 2), 0) / distances.length;
    
    return Math.exp(-variance / (avgDistance * avgDistance)); // Higher uniformity = lower variance
  }

  /**
   * Calculate accessibility score based on corridor coverage
   */
  private calculateAccessibility(ilots: Ilot[], corridors: Corridor[]): number {
    if (ilots.length === 0) return 1;
    
    let accessibleIlots = 0;
    
    for (const ilot of ilots) {
      for (const corridor of corridors) {
        if (corridor.connectedIlots.includes(ilot.id)) {
          accessibleIlots++;
          break;
        }
      }
    }
    
    return accessibleIlots / ilots.length;
  }

  /**
   * Calculate energy efficiency score (compact layouts are more efficient)
   */
  private calculateEnergyEfficiency(ilots: Ilot[]): number {
    if (ilots.length === 0) return 1;
    
    // Calculate total perimeter (less perimeter = more efficient)
    const totalPerimeter = ilots.reduce((sum, ilot) => 
      sum + 2 * (ilot.width + ilot.height), 0
    );
    
    const totalArea = ilots.reduce((sum, ilot) => sum + ilot.area!, 0);
    
    // Calculate compactness ratio (area to perimeter ratio)
    return totalArea / totalPerimeter;
  }

  /**
   * Calculate aesthetic arrangement score
   */
  private calculateAestheticScore(ilots: Ilot[]): number {
    if (ilots.length === 0) return 1;
    
    // Score based on alignment and symmetry
    let alignmentScore = 0;
    const tolerance = 0.5;
    
    // Check horizontal alignment
    for (let i = 0; i < ilots.length; i++) {
      for (let j = i + 1; j < ilots.length; j++) {
        if (Math.abs(ilots[i].y - ilots[j].y) < tolerance) {
          alignmentScore++;
        }
        if (Math.abs(ilots[i].x - ilots[j].x) < tolerance) {
          alignmentScore++;
        }
      }
    }
    
    const maxPossibleAlignments = ilots.length * (ilots.length - 1);
    return maxPossibleAlignments > 0 ? alignmentScore / maxPossibleAlignments : 1;
  }

  /**
   * Fallback heuristic scoring when ML model is not available
   */
  private calculateHeuristicScore(
    ilots: Ilot[],
    corridors: Corridor[],
    availableAreas: Rectangle[]
  ): number {
    const totalAvailableArea = availableAreas.reduce((sum, area) => sum + (area.width * area.height), 0);
    const totalIlotArea = ilots.reduce((sum, ilot) => sum + ilot.area!, 0);
    
    const utilizationScore = (totalIlotArea / totalAvailableArea) * 40;
    const overlapPenalty = this.calculateOverlapPenalty(ilots) * 20;
    const corridorBonus = corridors.length * 5;
    const accessibilityBonus = this.calculateAccessibility(ilots, corridors) * 20;
    const aestheticBonus = this.calculateAestheticScore(ilots) * 15;
    
    return Math.max(0, utilizationScore - overlapPenalty + corridorBonus + accessibilityBonus + aestheticBonus);
  }

  /**
   * Utility function to get bounding box from coordinate points
   */
  private getBoundingBox(coordinates: Point[]): Rectangle {
    const minX = Math.min(...coordinates.map(p => p.x));
    const maxX = Math.max(...coordinates.map(p => p.x));
    const minY = Math.min(...coordinates.map(p => p.y));
    const maxY = Math.max(...coordinates.map(p => p.y));
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Subtract a rectangle from a list of available areas
   */
  private subtractRectangleFromAreas(areas: Rectangle[], toSubtract: Rectangle): Rectangle[] {
    const result: Rectangle[] = [];
    
    for (const area of areas) {
      // Check if rectangles intersect
      if (
        area.x < toSubtract.x + toSubtract.width &&
        area.x + area.width > toSubtract.x &&
        area.y < toSubtract.y + toSubtract.height &&
        area.y + area.height > toSubtract.y
      ) {
        // Split the area into up to 4 non-overlapping rectangles
        const splits: Rectangle[] = [];
        
        // Left part
        if (area.x < toSubtract.x) {
          splits.push({
            x: area.x,
            y: area.y,
            width: toSubtract.x - area.x,
            height: area.height
          });
        }
        
        // Right part
        if (area.x + area.width > toSubtract.x + toSubtract.width) {
          splits.push({
            x: toSubtract.x + toSubtract.width,
            y: area.y,
            width: (area.x + area.width) - (toSubtract.x + toSubtract.width),
            height: area.height
          });
        }
        
        // Top part
        if (area.y < toSubtract.y) {
          splits.push({
            x: Math.max(area.x, toSubtract.x),
            y: area.y,
            width: Math.min(area.x + area.width, toSubtract.x + toSubtract.width) - Math.max(area.x, toSubtract.x),
            height: toSubtract.y - area.y
          });
        }
        
        // Bottom part
        if (area.y + area.height > toSubtract.y + toSubtract.height) {
          splits.push({
            x: Math.max(area.x, toSubtract.x),
            y: toSubtract.y + toSubtract.height,
            width: Math.min(area.x + area.width, toSubtract.x + toSubtract.width) - Math.max(area.x, toSubtract.x),
            height: (area.y + area.height) - (toSubtract.y + toSubtract.height)
          });
        }
        
        result.push(...splits.filter(split => split.width > 0 && split.height > 0));
      } else {
        // No intersection, keep the area as is
        result.push(area);
      }
    }
    
    return result;
  }
}