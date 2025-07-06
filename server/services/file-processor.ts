import DxfParser from 'dxf-parser';
import sharp from 'sharp';
import { Zone, InsertZone } from '../../shared/schema';

export interface ProcessedFloorPlan {
  width: number;
  height: number;
  zones: Omit<InsertZone, 'floorPlanId'>[];
  metadata: {
    entities: number;
    layers: string[];
    units: string;
    bounds: {
      minX: number;
      maxX: number;
      minY: number;
      maxY: number;
    };
  };
}

export interface Point {
  x: number;
  y: number;
}

export interface DXFEntity {
  type: string;
  layer: string;
  color?: number;
  vertices?: Point[];
  center?: Point;
  radius?: number;
  startPoint?: Point;
  endPoint?: Point;
}

export class FileProcessor {
  private colorZoneMapping = {
    1: 'wall',        // Red - typically walls or boundaries
    2: 'restricted',  // Yellow - restricted areas
    3: 'restricted',  // Green - utilities/restricted
    4: 'restricted',  // Cyan - stairs/elevators (light blue)
    5: 'wall',        // Blue - walls
    6: 'restricted',  // Magenta - restricted areas
    7: 'wall',        // White/Black - walls
    8: 'wall',        // Dark gray - walls
    9: 'wall',        // Light gray - walls
    256: 'wall'       // By layer color
  };

  /**
   * Process DXF file and extract zones
   */
  async processDXF(buffer: Buffer): Promise<ProcessedFloorPlan> {
    try {
      const parser = new DxfParser();
      const dxf = parser.parseSync(buffer.toString());
      
      if (!dxf) {
        throw new Error('Failed to parse DXF file');
      }

      // Extract bounds
      const bounds = this.calculateBounds(dxf);
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;

      // Extract and classify entities
      const entities = this.extractEntities(dxf);
      const zones = this.detectZones(entities, bounds);

      // Get layer information
      const layers = Object.keys(dxf.tables?.layer?.layers || {});

      return {
        width,
        height,
        zones,
        metadata: {
          entities: entities.length,
          layers,
          units: dxf.header?.$INSUNITS || 'unknown',
          bounds
        }
      };
    } catch (error) {
      console.error('DXF processing error:', error);
      throw new Error(`Failed to process DXF file: ${error.message}`);
    }
  }

  /**
   * Process image files (PNG, JPG) using color detection
   */
  async processImage(buffer: Buffer): Promise<ProcessedFloorPlan> {
    try {
      const image = sharp(buffer);
      const metadata = await image.metadata();
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image dimensions');
      }

      // Convert image to RGB and analyze colors
      const { data, info } = await image
        .raw()
        .toBuffer({ resolveWithObject: true });

      const zones = await this.detectZonesFromImage(data, info);

      return {
        width: metadata.width,
        height: metadata.height,
        zones,
        metadata: {
          entities: zones.length,
          layers: ['image_analysis'],
          units: 'pixels',
          bounds: {
            minX: 0,
            maxX: metadata.width,
            minY: 0,
            maxY: metadata.height
          }
        }
      };
    } catch (error) {
      console.error('Image processing error:', error);
      throw new Error(`Failed to process image file: ${error.message}`);
    }
  }

  /**
   * Calculate bounds from DXF entities
   */
  private calculateBounds(dxf: any): { minX: number; maxX: number; minY: number; maxY: number } {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    const processPoint = (point: Point) => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    };

    // Process all entities to find bounds
    if (dxf.entities) {
      for (const entity of dxf.entities) {
        switch (entity.type) {
          case 'LINE':
            processPoint(entity.startPoint);
            processPoint(entity.endPoint);
            break;
          case 'CIRCLE':
            processPoint({ x: entity.center.x - entity.radius, y: entity.center.y - entity.radius });
            processPoint({ x: entity.center.x + entity.radius, y: entity.center.y + entity.radius });
            break;
          case 'POLYLINE':
          case 'LWPOLYLINE':
            if (entity.vertices) {
              entity.vertices.forEach(processPoint);
            }
            break;
          case 'ARC':
            // Approximate arc bounds
            processPoint({ x: entity.center.x - entity.radius, y: entity.center.y - entity.radius });
            processPoint({ x: entity.center.x + entity.radius, y: entity.center.y + entity.radius });
            break;
        }
      }
    }

    // Fallback bounds if nothing found
    if (minX === Infinity) {
      return { minX: 0, maxX: 100, minY: 0, maxY: 100 };
    }

    return { minX, maxX, minY, maxY };
  }

  /**
   * Extract entities from DXF and normalize them
   */
  private extractEntities(dxf: any): DXFEntity[] {
    const entities: DXFEntity[] = [];

    if (!dxf.entities) {
      return entities;
    }

    for (const entity of dxf.entities) {
      const normalizedEntity: DXFEntity = {
        type: entity.type,
        layer: entity.layer || '0',
        color: entity.color || 256
      };

      switch (entity.type) {
        case 'LINE':
          normalizedEntity.startPoint = entity.startPoint;
          normalizedEntity.endPoint = entity.endPoint;
          normalizedEntity.vertices = [entity.startPoint, entity.endPoint];
          break;

        case 'CIRCLE':
          normalizedEntity.center = entity.center;
          normalizedEntity.radius = entity.radius;
          // Convert circle to polygon approximation
          normalizedEntity.vertices = this.circleToPolygon(entity.center, entity.radius, 16);
          break;

        case 'POLYLINE':
        case 'LWPOLYLINE':
          normalizedEntity.vertices = entity.vertices || [];
          break;

        case 'ARC':
          normalizedEntity.center = entity.center;
          normalizedEntity.radius = entity.radius;
          // Convert arc to polyline approximation
          normalizedEntity.vertices = this.arcToPolyline(
            entity.center,
            entity.radius,
            entity.startAngle || 0,
            entity.endAngle || Math.PI * 2,
            8
          );
          break;

        case 'RECTANGLE':
        case 'SOLID':
          if (entity.points && entity.points.length >= 3) {
            normalizedEntity.vertices = entity.points;
          }
          break;
      }

      if (normalizedEntity.vertices && normalizedEntity.vertices.length > 0) {
        entities.push(normalizedEntity);
      }
    }

    return entities;
  }

  /**
   * Convert circle to polygon points
   */
  private circleToPolygon(center: Point, radius: number, segments: number): Point[] {
    const points: Point[] = [];
    for (let i = 0; i < segments; i++) {
      const angle = (i * 2 * Math.PI) / segments;
      points.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      });
    }
    return points;
  }

  /**
   * Convert arc to polyline points
   */
  private arcToPolyline(
    center: Point,
    radius: number,
    startAngle: number,
    endAngle: number,
    segments: number
  ): Point[] {
    const points: Point[] = [];
    const angleRange = endAngle - startAngle;
    
    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + (i * angleRange) / segments;
      points.push({
        x: center.x + radius * Math.cos(angle),
        y: center.y + radius * Math.sin(angle)
      });
    }
    
    return points;
  }

  /**
   * Detect zones from DXF entities
   */
  private detectZones(entities: DXFEntity[], bounds: any): Omit<InsertZone, 'floorPlanId'>[] {
    const zones: Omit<InsertZone, 'floorPlanId'>[] = [];

    // Group entities by layer and color
    const entityGroups = this.groupEntitiesByTypeAndColor(entities);

    for (const [key, groupEntities] of entityGroups) {
      const [layer, colorStr] = key.split('_');
      const color = parseInt(colorStr);
      
      // Determine zone type based on color and layer
      const zoneType = this.determineZoneType(layer, color);
      const zoneColor = this.getZoneColor(zoneType);

      // Merge nearby entities into zones
      const mergedZones = this.mergeEntitiesIntoZones(groupEntities, zoneType);

      for (const zone of mergedZones) {
        if (zone.coordinates.length >= 3) { // Need at least 3 points for a valid zone
          zones.push({
            type: zone.type,
            color: zoneColor,
            coordinates: zone.coordinates,
            area: this.calculatePolygonArea(zone.coordinates),
            properties: {
              layer,
              originalColor: color,
              entityCount: zone.entityCount
            }
          });
        }
      }
    }

    // Add boundary walls if not detected
    if (!zones.some(z => z.type === 'wall')) {
      zones.push({
        type: 'wall',
        color: '#000000',
        coordinates: [
          { x: bounds.minX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.maxY },
          { x: bounds.minX, y: bounds.maxY }
        ],
        area: (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY),
        properties: {
          layer: 'boundary',
          generated: true
        }
      });
    }

    return zones;
  }

  /**
   * Group entities by layer and color for analysis
   */
  private groupEntitiesByTypeAndColor(entities: DXFEntity[]): Map<string, DXFEntity[]> {
    const groups = new Map<string, DXFEntity[]>();

    for (const entity of entities) {
      const key = `${entity.layer}_${entity.color}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(entity);
    }

    return groups;
  }

  /**
   * Determine zone type based on layer name and color
   */
  private determineZoneType(layer: string, color: number): string {
    const layerLower = layer.toLowerCase();

    // Layer-based detection
    if (layerLower.includes('wall') || layerLower.includes('mur')) {
      return 'wall';
    }
    if (layerLower.includes('stair') || layerLower.includes('escalier') || layerLower.includes('elevator')) {
      return 'restricted';
    }
    if (layerLower.includes('entrance') || layerLower.includes('exit') || layerLower.includes('entree') || layerLower.includes('sortie')) {
      return 'entrance';
    }

    // Color-based detection (following the legend from the images)
    if (color === 1 || color === 5) { // Red or Blue - could be entrance/exit
      return 'entrance';
    }
    if (color === 4 || color === 6) { // Cyan or Magenta - restricted areas
      return 'restricted';
    }

    // Default to wall for black/white/gray colors
    return 'wall';
  }

  /**
   * Get display color for zone type
   */
  private getZoneColor(zoneType: string): string {
    switch (zoneType) {
      case 'wall': return '#000000';          // Black
      case 'restricted': return '#00BFFF';    // Light blue
      case 'entrance': return '#FF0000';      // Red
      case 'exit': return '#FF0000';          // Red
      default: return '#808080';              // Gray
    }
  }

  /**
   * Merge nearby entities into coherent zones
   */
  private mergeEntitiesIntoZones(
    entities: DXFEntity[],
    zoneType: string
  ): { type: string; coordinates: Point[]; entityCount: number }[] {
    const zones: { type: string; coordinates: Point[]; entityCount: number }[] = [];

    if (entities.length === 0) return zones;

    // For walls and lines, try to connect them into continuous paths
    if (zoneType === 'wall') {
      const connectedPaths = this.connectLinearEntities(entities);
      for (const path of connectedPaths) {
        zones.push({
          type: zoneType,
          coordinates: path,
          entityCount: 1
        });
      }
    } else {
      // For areas (restricted, entrance), merge overlapping/nearby polygons
      const mergedPolygons = this.mergePolygonEntities(entities);
      for (const polygon of mergedPolygons) {
        zones.push({
          type: zoneType,
          coordinates: polygon.coordinates,
          entityCount: polygon.entityCount
        });
      }
    }

    return zones;
  }

  /**
   * Connect linear entities (lines) into continuous paths
   */
  private connectLinearEntities(entities: DXFEntity[]): Point[][] {
    const paths: Point[][] = [];
    const tolerance = 0.1; // Connection tolerance

    for (const entity of entities) {
      if (!entity.vertices || entity.vertices.length < 2) continue;

      let addedToExistingPath = false;

      // Try to connect to existing paths
      for (const path of paths) {
        const pathStart = path[0];
        const pathEnd = path[path.length - 1];
        const entityStart = entity.vertices[0];
        const entityEnd = entity.vertices[entity.vertices.length - 1];

        // Check if entity connects to end of path
        if (this.pointsAreClose(pathEnd, entityStart, tolerance)) {
          path.push(...entity.vertices.slice(1));
          addedToExistingPath = true;
          break;
        }
        // Check if entity connects to start of path
        else if (this.pointsAreClose(pathStart, entityEnd, tolerance)) {
          path.unshift(...entity.vertices.slice(0, -1));
          addedToExistingPath = true;
          break;
        }
        // Check reverse connections
        else if (this.pointsAreClose(pathEnd, entityEnd, tolerance)) {
          path.push(...entity.vertices.slice(0, -1).reverse());
          addedToExistingPath = true;
          break;
        }
        else if (this.pointsAreClose(pathStart, entityStart, tolerance)) {
          path.unshift(...entity.vertices.slice(1).reverse());
          addedToExistingPath = true;
          break;
        }
      }

      // If not connected to existing path, start new path
      if (!addedToExistingPath) {
        paths.push([...entity.vertices]);
      }
    }

    return paths;
  }

  /**
   * Merge polygon entities into larger areas
   */
  private mergePolygonEntities(entities: DXFEntity[]): { coordinates: Point[]; entityCount: number }[] {
    const polygons: { coordinates: Point[]; entityCount: number }[] = [];

    for (const entity of entities) {
      if (!entity.vertices || entity.vertices.length < 3) continue;

      // For now, treat each entity as a separate polygon
      // In a more advanced implementation, you could merge overlapping polygons
      polygons.push({
        coordinates: [...entity.vertices],
        entityCount: 1
      });
    }

    return polygons;
  }

  /**
   * Check if two points are close within tolerance
   */
  private pointsAreClose(p1: Point, p2: Point, tolerance: number): boolean {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy) <= tolerance;
  }

  /**
   * Calculate area of a polygon using shoelace formula
   */
  private calculatePolygonArea(coordinates: Point[]): number {
    if (coordinates.length < 3) return 0;

    let area = 0;
    for (let i = 0; i < coordinates.length; i++) {
      const j = (i + 1) % coordinates.length;
      area += coordinates[i].x * coordinates[j].y;
      area -= coordinates[j].x * coordinates[i].y;
    }
    return Math.abs(area) / 2;
  }

  /**
   * Detect zones from image color analysis
   */
  private async detectZonesFromImage(
    imageData: Buffer,
    info: { width: number; height: number; channels: number }
  ): Promise<Omit<InsertZone, 'floorPlanId'>[]> {
    const zones: Omit<InsertZone, 'floorPlanId'>[] = [];
    const { width, height, channels } = info;

    // Color definitions based on the legend
    const colorMap = {
      'wall': { r: 0, g: 0, b: 0, tolerance: 50 },           // Black walls
      'restricted': { r: 0, g: 191, b: 255, tolerance: 50 }, // Light blue
      'entrance': { r: 255, g: 0, b: 0, tolerance: 50 }      // Red
    };

    // Analyze image in blocks to detect color regions
    const blockSize = 10;
    const detectedRegions: { [key: string]: Point[] } = {};

    for (let y = 0; y < height; y += blockSize) {
      for (let x = 0; x < width; x += blockSize) {
        const pixelIndex = (y * width + x) * channels;
        
        if (pixelIndex + 2 < imageData.length) {
          const r = imageData[pixelIndex];
          const g = imageData[pixelIndex + 1];
          const b = imageData[pixelIndex + 2];

          // Check which color this pixel matches
          for (const [zoneType, color] of Object.entries(colorMap)) {
            if (
              Math.abs(r - color.r) <= color.tolerance &&
              Math.abs(g - color.g) <= color.tolerance &&
              Math.abs(b - color.b) <= color.tolerance
            ) {
              if (!detectedRegions[zoneType]) {
                detectedRegions[zoneType] = [];
              }
              detectedRegions[zoneType].push({ x, y });
            }
          }
        }
      }
    }

    // Convert detected regions to zones
    for (const [zoneType, points] of Object.entries(detectedRegions)) {
      if (points.length > 0) {
        // Create bounding rectangles for detected regions
        const clusters = this.clusterPoints(points, blockSize * 2);
        
        for (const cluster of clusters) {
          const minX = Math.min(...cluster.map(p => p.x));
          const maxX = Math.max(...cluster.map(p => p.x));
          const minY = Math.min(...cluster.map(p => p.y));
          const maxY = Math.max(...cluster.map(p => p.y));

          const coordinates = [
            { x: minX, y: minY },
            { x: maxX, y: minY },
            { x: maxX, y: maxY },
            { x: minX, y: maxY }
          ];

          zones.push({
            type: zoneType,
            color: this.getZoneColor(zoneType),
            coordinates,
            area: (maxX - minX) * (maxY - minY),
            properties: {
              source: 'image_analysis',
              pixelCount: cluster.length
            }
          });
        }
      }
    }

    return zones;
  }

  /**
   * Cluster nearby points together
   */
  private clusterPoints(points: Point[], maxDistance: number): Point[][] {
    const clusters: Point[][] = [];
    const visited = new Set<number>();

    for (let i = 0; i < points.length; i++) {
      if (visited.has(i)) continue;

      const cluster = [points[i]];
      visited.add(i);

      // Find all points within distance
      for (let j = i + 1; j < points.length; j++) {
        if (visited.has(j)) continue;

        const distance = Math.sqrt(
          Math.pow(points[i].x - points[j].x, 2) +
          Math.pow(points[i].y - points[j].y, 2)
        );

        if (distance <= maxDistance) {
          cluster.push(points[j]);
          visited.add(j);
        }
      }

      if (cluster.length >= 3) { // Minimum cluster size
        clusters.push(cluster);
      }
    }

    return clusters;
  }
}