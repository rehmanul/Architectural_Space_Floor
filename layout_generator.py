
import random
import math
import numpy as np
from typing import List, Dict, Tuple, Any
from dataclasses import dataclass
from models import FloorPlan, IlotProfile, ZoneAnnotation
import logging

@dataclass
class Point:
    x: float
    y: float

@dataclass
class Rectangle:
    x: float
    y: float
    width: float
    height: float
    
    @property
    def area(self) -> float:
        return self.width * self.height
    
    @property
    def center(self) -> Point:
        return Point(self.x + self.width/2, self.y + self.height/2)
    
    def contains_point(self, point: Point) -> bool:
        return (self.x <= point.x <= self.x + self.width and 
                self.y <= point.y <= self.y + self.height)
    
    def intersects(self, other: 'Rectangle') -> bool:
        return not (self.x + self.width < other.x or 
                   other.x + other.width < self.x or
                   self.y + self.height < other.y or 
                   other.y + other.height < self.y)

@dataclass
class Ilot:
    id: str
    rect: Rectangle
    room_type: str
    area: float
    min_size: float
    max_size: float

@dataclass
class Corridor:
    id: str
    rect: Rectangle
    width: float
    connected_ilots: List[str]

class LayoutGenerator:
    """AI-powered layout generation using genetic algorithms and constraint satisfaction"""
    
    def __init__(self, floor_plan: FloorPlan, profile: IlotProfile, zones: List[ZoneAnnotation]):
        self.floor_plan = floor_plan
        self.profile = profile
        self.zones = zones
        self.logger = logging.getLogger(__name__)
        
        # Extract zone data
        self.walls = []
        self.restricted_areas = []
        self.entrance_areas = []
        
        for zone in zones:
            coords = zone.coordinates or []
            if zone.type == 'wall':
                self.walls.extend(self._coords_to_rectangles(coords))
            elif zone.type == 'restricted':
                self.restricted_areas.extend(self._coords_to_rectangles(coords))
            elif zone.type in ['entrance', 'exit']:
                self.entrance_areas.extend(self._coords_to_rectangles(coords))
    
    def generate_layout(self, algorithm: str = 'genetic') -> Dict[str, Any]:
        """Generate optimal layout using specified algorithm"""
        if algorithm == 'genetic':
            return self._genetic_algorithm()
        elif algorithm == 'greedy':
            return self._greedy_placement()
        elif algorithm == 'random':
            return self._random_placement()
        else:
            return self._genetic_algorithm()
    
    def _genetic_algorithm(self) -> Dict[str, Any]:
        """Genetic algorithm for optimal ilot placement"""
        population_size = 50
        generations = 100
        mutation_rate = 0.1
        
        # Generate initial population
        population = []
        for _ in range(population_size):
            individual = self._create_random_layout()
            population.append(individual)
        
        best_layout = None
        best_score = 0
        
        for generation in range(generations):
            # Evaluate fitness
            scored_population = []
            for individual in population:
                score = self._evaluate_fitness(individual)
                scored_population.append((individual, score))
            
            # Sort by fitness
            scored_population.sort(key=lambda x: x[1], reverse=True)
            
            # Track best
            if scored_population[0][1] > best_score:
                best_score = scored_population[0][1]
                best_layout = scored_population[0][0]
            
            # Selection and reproduction
            new_population = []
            
            # Keep top 20%
            elite_count = population_size // 5
            for i in range(elite_count):
                new_population.append(scored_population[i][0])
            
            # Generate offspring
            while len(new_population) < population_size:
                parent1 = self._tournament_selection(scored_population)
                parent2 = self._tournament_selection(scored_population)
                child = self._crossover(parent1, parent2)
                
                if random.random() < mutation_rate:
                    child = self._mutate(child)
                
                new_population.append(child)
            
            population = new_population
        
        return self._layout_to_result(best_layout, best_score)
    
    def _create_random_layout(self) -> Dict[str, Any]:
        """Create a random valid layout"""
        ilots = []
        corridors = []
        
        # Calculate available space
        available_area = self._calculate_available_area()
        
        # Generate ilots based on size distribution
        size_distribution = self.profile.size_distribution or [
            {'min_size': 15, 'max_size': 25, 'percentage': 40},
            {'min_size': 25, 'max_size': 35, 'percentage': 35},
            {'min_size': 35, 'max_size': 50, 'percentage': 25}
        ]
        
        total_ilots = min(100, int(available_area / 20))  # Estimate
        
        ilot_id = 1
        for size_config in size_distribution:
            count = int(total_ilots * size_config['percentage'] / 100)
            
            for _ in range(count):
                ilot = self._place_random_ilot(
                    str(ilot_id),
                    size_config['min_size'],
                    size_config['max_size'],
                    ilots
                )
                if ilot:
                    ilots.append(ilot)
                    ilot_id += 1
        
        # Generate corridors
        corridors = self._generate_corridors(ilots)
        
        return {
            'ilots': ilots,
            'corridors': corridors
        }
    
    def _place_random_ilot(self, ilot_id: str, min_size: float, max_size: float, 
                          existing_ilots: List[Ilot]) -> Ilot:
        """Attempt to place a single ilot randomly"""
        max_attempts = 100
        
        for _ in range(max_attempts):
            # Random size within range
            area = random.uniform(min_size, max_size)
            
            # Random aspect ratio (width/height)
            aspect_ratio = random.uniform(0.7, 1.8)
            width = math.sqrt(area * aspect_ratio)
            height = area / width
            
            # Random position
            x = random.uniform(0, self.floor_plan.width - width)
            y = random.uniform(0, self.floor_plan.height - height)
            
            rect = Rectangle(x, y, width, height)
            
            # Check constraints
            if self._is_valid_placement(rect, existing_ilots):
                return Ilot(
                    id=ilot_id,
                    rect=rect,
                    room_type='standard',
                    area=area,
                    min_size=min_size,
                    max_size=max_size
                )
        
        return None
    
    def _is_valid_placement(self, rect: Rectangle, existing_ilots: List[Ilot]) -> bool:
        """Check if placement is valid according to constraints"""
        
        # Check boundaries
        if (rect.x < 0 or rect.y < 0 or 
            rect.x + rect.width > self.floor_plan.width or
            rect.y + rect.height > self.floor_plan.height):
            return False
        
        # Check overlap with existing ilots
        for ilot in existing_ilots:
            if rect.intersects(ilot.rect):
                return False
        
        # Check restricted areas
        for restricted in self.restricted_areas:
            if rect.intersects(restricted):
                return False
        
        # Check entrance areas (no placement allowed)
        for entrance in self.entrance_areas:
            if rect.intersects(entrance):
                return False
        
        return True
    
    def _generate_corridors(self, ilots: List[Ilot]) -> List[Corridor]:
        """Generate corridors between ilot groups"""
        corridors = []
        corridor_width = self.profile.corridor_width
        
        # Simple corridor generation - horizontal and vertical strips
        corridor_id = 1
        
        # Horizontal corridors
        y_positions = self._find_corridor_positions(ilots, 'horizontal')
        for y in y_positions:
            corridor = Corridor(
                id=f"h_corridor_{corridor_id}",
                rect=Rectangle(0, y, self.floor_plan.width, corridor_width),
                width=corridor_width,
                connected_ilots=self._find_connected_ilots(
                    Rectangle(0, y, self.floor_plan.width, corridor_width), ilots
                )
            )
            corridors.append(corridor)
            corridor_id += 1
        
        # Vertical corridors
        x_positions = self._find_corridor_positions(ilots, 'vertical')
        for x in x_positions:
            corridor = Corridor(
                id=f"v_corridor_{corridor_id}",
                rect=Rectangle(x, 0, corridor_width, self.floor_plan.height),
                width=corridor_width,
                connected_ilots=self._find_connected_ilots(
                    Rectangle(x, 0, corridor_width, self.floor_plan.height), ilots
                )
            )
            corridors.append(corridor)
            corridor_id += 1
        
        return corridors
    
    def _find_corridor_positions(self, ilots: List[Ilot], direction: str) -> List[float]:
        """Find optimal positions for corridors"""
        positions = []
        
        if direction == 'horizontal':
            # Find gaps between ilot rows
            y_positions = sorted([ilot.rect.y for ilot in ilots] + 
                               [ilot.rect.y + ilot.rect.height for ilot in ilots])
            
            for i in range(len(y_positions) - 1):
                gap_start = y_positions[i]
                gap_end = y_positions[i + 1]
                gap_size = gap_end - gap_start
                
                if gap_size >= self.profile.corridor_width * 1.5:
                    positions.append(gap_start + gap_size / 2 - self.profile.corridor_width / 2)
        
        else:  # vertical
            x_positions = sorted([ilot.rect.x for ilot in ilots] + 
                               [ilot.rect.x + ilot.rect.width for ilot in ilots])
            
            for i in range(len(x_positions) - 1):
                gap_start = x_positions[i]
                gap_end = x_positions[i + 1]
                gap_size = gap_end - gap_start
                
                if gap_size >= self.profile.corridor_width * 1.5:
                    positions.append(gap_start + gap_size / 2 - self.profile.corridor_width / 2)
        
        return positions[:3]  # Limit number of corridors
    
    def _find_connected_ilots(self, corridor_rect: Rectangle, ilots: List[Ilot]) -> List[str]:
        """Find ilots that are adjacent to a corridor"""
        connected = []
        buffer = 2.0  # Small buffer for adjacency
        
        for ilot in ilots:
            # Check if ilot is adjacent to corridor
            expanded_corridor = Rectangle(
                corridor_rect.x - buffer,
                corridor_rect.y - buffer,
                corridor_rect.width + 2 * buffer,
                corridor_rect.height + 2 * buffer
            )
            
            if expanded_corridor.intersects(ilot.rect):
                connected.append(ilot.id)
        
        return connected
    
    def _evaluate_fitness(self, layout: Dict[str, Any]) -> float:
        """Evaluate fitness of a layout"""
        ilots = layout['ilots']
        corridors = layout['corridors']
        
        if not ilots:
            return 0
        
        score = 0
        
        # Space utilization (30%)
        total_ilot_area = sum(ilot.area for ilot in ilots)
        available_area = self._calculate_available_area()
        utilization = total_ilot_area / available_area if available_area > 0 else 0
        score += utilization * 0.3
        
        # Corridor efficiency (20%)
        total_corridor_area = sum(c.rect.area for c in corridors)
        corridor_ratio = total_corridor_area / available_area if available_area > 0 else 0
        corridor_score = max(0, 1 - corridor_ratio * 2)  # Lower corridor ratio is better
        score += corridor_score * 0.2
        
        # Accessibility (25%)
        connected_ilots = set()
        for corridor in corridors:
            connected_ilots.update(corridor.connected_ilots)
        
        accessibility = len(connected_ilots) / len(ilots) if ilots else 0
        score += accessibility * 0.25
        
        # Size distribution adherence (15%)
        size_score = self._evaluate_size_distribution(ilots)
        score += size_score * 0.15
        
        # Regularity/aesthetics (10%)
        regularity_score = self._evaluate_regularity(ilots)
        score += regularity_score * 0.1
        
        return min(1.0, score)
    
    def _evaluate_size_distribution(self, ilots: List[Ilot]) -> float:
        """Evaluate how well the layout matches target size distribution"""
        if not self.profile.size_distribution:
            return 1.0
        
        actual_distribution = {}
        for ilot in ilots:
            size_range = self._get_size_range(ilot.area)
            actual_distribution[size_range] = actual_distribution.get(size_range, 0) + 1
        
        total_ilots = len(ilots)
        score = 0
        
        for target_range in self.profile.size_distribution:
            range_key = f"{target_range['min_size']}-{target_range['max_size']}"
            actual_count = actual_distribution.get(range_key, 0)
            actual_percentage = actual_count / total_ilots if total_ilots > 0 else 0
            target_percentage = target_range['percentage'] / 100
            
            # Penalize deviation from target
            deviation = abs(actual_percentage - target_percentage)
            score += max(0, 1 - deviation * 2)
        
        return score / len(self.profile.size_distribution) if self.profile.size_distribution else 1.0
    
    def _get_size_range(self, area: float) -> str:
        """Get size range key for an area"""
        for size_range in self.profile.size_distribution:
            if size_range['min_size'] <= area <= size_range['max_size']:
                return f"{size_range['min_size']}-{size_range['max_size']}"
        return "other"
    
    def _evaluate_regularity(self, ilots: List[Ilot]) -> float:
        """Evaluate layout regularity and aesthetics"""
        if len(ilots) < 2:
            return 1.0
        
        # Check alignment
        x_positions = [ilot.rect.x for ilot in ilots]
        y_positions = [ilot.rect.y for ilot in ilots]
        
        # Count aligned ilots
        aligned_count = 0
        tolerance = 2.0
        
        for i, ilot1 in enumerate(ilots):
            for j, ilot2 in enumerate(ilots[i+1:], i+1):
                if (abs(ilot1.rect.x - ilot2.rect.x) < tolerance or
                    abs(ilot1.rect.y - ilot2.rect.y) < tolerance):
                    aligned_count += 1
        
        max_pairs = len(ilots) * (len(ilots) - 1) // 2
        alignment_score = aligned_count / max_pairs if max_pairs > 0 else 0
        
        return min(1.0, alignment_score)
    
    def _tournament_selection(self, scored_population: List[Tuple]) -> Dict[str, Any]:
        """Tournament selection for genetic algorithm"""
        tournament_size = 5
        tournament = random.sample(scored_population, min(tournament_size, len(scored_population)))
        return max(tournament, key=lambda x: x[1])[0]
    
    def _crossover(self, parent1: Dict[str, Any], parent2: Dict[str, Any]) -> Dict[str, Any]:
        """Crossover operation for genetic algorithm"""
        # Simple crossover: take ilots from both parents
        all_ilots = parent1['ilots'] + parent2['ilots']
        
        # Remove overlapping ilots
        final_ilots = []
        for ilot in all_ilots:
            if not any(ilot.rect.intersects(existing.rect) for existing in final_ilots):
                final_ilots.append(ilot)
        
        # Regenerate corridors
        corridors = self._generate_corridors(final_ilots)
        
        return {
            'ilots': final_ilots,
            'corridors': corridors
        }
    
    def _mutate(self, individual: Dict[str, Any]) -> Dict[str, Any]:
        """Mutation operation for genetic algorithm"""
        ilots = individual['ilots'].copy()
        
        if ilots:
            # Randomly modify one ilot
            mutate_idx = random.randint(0, len(ilots) - 1)
            ilot = ilots[mutate_idx]
            
            # Small random adjustment
            dx = random.uniform(-5, 5)
            dy = random.uniform(-5, 5)
            
            new_rect = Rectangle(
                ilot.rect.x + dx,
                ilot.rect.y + dy,
                ilot.rect.width,
                ilot.rect.height
            )
            
            # Check if mutation is valid
            other_ilots = ilots[:mutate_idx] + ilots[mutate_idx+1:]
            if self._is_valid_placement(new_rect, other_ilots):
                ilots[mutate_idx] = Ilot(
                    id=ilot.id,
                    rect=new_rect,
                    room_type=ilot.room_type,
                    area=ilot.area,
                    min_size=ilot.min_size,
                    max_size=ilot.max_size
                )
        
        corridors = self._generate_corridors(ilots)
        
        return {
            'ilots': ilots,
            'corridors': corridors
        }
    
    def _greedy_placement(self) -> Dict[str, Any]:
        """Simple greedy placement algorithm"""
        ilots = []
        
        # Grid-based placement
        grid_size = 30  # Base grid size
        
        for y in range(0, int(self.floor_plan.height), grid_size):
            for x in range(0, int(self.floor_plan.width), grid_size):
                if len(ilots) >= 50:  # Limit number of ilots
                    break
                
                # Try to place an ilot here
                width = random.uniform(15, 25)
                height = random.uniform(15, 25)
                
                rect = Rectangle(x, y, width, height)
                
                if self._is_valid_placement(rect, ilots):
                    ilot = Ilot(
                        id=str(len(ilots) + 1),
                        rect=rect,
                        room_type='standard',
                        area=width * height,
                        min_size=15,
                        max_size=25
                    )
                    ilots.append(ilot)
        
        corridors = self._generate_corridors(ilots)
        score = self._evaluate_fitness({'ilots': ilots, 'corridors': corridors})
        
        return self._layout_to_result({'ilots': ilots, 'corridors': corridors}, score)
    
    def _random_placement(self) -> Dict[str, Any]:
        """Simple random placement"""
        layout = self._create_random_layout()
        score = self._evaluate_fitness(layout)
        return self._layout_to_result(layout, score)
    
    def _layout_to_result(self, layout: Dict[str, Any], score: float) -> Dict[str, Any]:
        """Convert internal layout to API result format"""
        ilots_data = []
        for ilot in layout['ilots']:
            ilots_data.append({
                'id': ilot.id,
                'x': ilot.rect.x,
                'y': ilot.rect.y,
                'width': ilot.rect.width,
                'height': ilot.rect.height,
                'area': ilot.area,
                'room_type': ilot.room_type
            })
        
        corridors_data = []
        for corridor in layout['corridors']:
            corridors_data.append({
                'id': corridor.id,
                'x': corridor.rect.x,
                'y': corridor.rect.y,
                'width': corridor.rect.width,
                'height': corridor.rect.height,
                'corridor_width': corridor.width,
                'connectedIlots': corridor.connected_ilots
            })
        
        total_ilot_area = sum(ilot.area for ilot in layout['ilots'])
        available_area = self._calculate_available_area()
        utilization = (total_ilot_area / available_area * 100) if available_area > 0 else 0
        
        return {
            'ilots': ilots_data,
            'corridors': corridors_data,
            'utilization_percentage': utilization,
            'optimization_score': score
        }
    
    def _calculate_available_area(self) -> float:
        """Calculate available area for placement"""
        total_area = self.floor_plan.width * self.floor_plan.height
        
        # Subtract restricted areas
        restricted_area = sum(r.area for r in self.restricted_areas)
        entrance_area = sum(e.area for e in self.entrance_areas)
        
        return max(0, total_area - restricted_area - entrance_area)
    
    def _coords_to_rectangles(self, coordinates: List) -> List[Rectangle]:
        """Convert coordinate lists to Rectangle objects"""
        rectangles = []
        
        if not coordinates:
            return rectangles
        
        # Handle different coordinate formats
        if isinstance(coordinates[0], dict) and 'x' in coordinates[0]:
            # List of points
            if len(coordinates) >= 4:
                # Assume rectangular from 4 points
                xs = [p['x'] for p in coordinates]
                ys = [p['y'] for p in coordinates]
                
                min_x, max_x = min(xs), max(xs)
                min_y, max_y = min(ys), max(ys)
                
                rectangles.append(Rectangle(min_x, min_y, max_x - min_x, max_y - min_y))
        
        elif isinstance(coordinates[0], list) and len(coordinates[0]) == 2:
            # List of [x, y] pairs
            if len(coordinates) >= 4:
                xs = [p[0] for p in coordinates]
                ys = [p[1] for p in coordinates]
                
                min_x, max_x = min(xs), max(xs)
                min_y, max_y = min(ys), max(ys)
                
                rectangles.append(Rectangle(min_x, min_y, max_x - min_x, max_y - min_y))
        
        return rectangles
