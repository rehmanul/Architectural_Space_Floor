# Hotel Layout Optimizer

## Overview

This is a hotel layout optimization application that automatically places "îlots" (room units) within floor plans while respecting architectural constraints. The system reads DXF files or layered images, identifies different zones (walls, restricted areas, entrances), and generates optimal room layouts based on user-defined size distributions.

## System Architecture

### Frontend Architecture
- **Technology**: Modern web application (likely React/Vue.js or vanilla JavaScript)
- **Purpose**: Provides interactive interface for uploading floor plans, configuring îlot distributions, and visualizing results
- **Key Features**: 
  - DXF file upload and processing
  - Interactive plan visualization
  - Configuration panels for îlot size distributions
  - Real-time layout preview

### Backend Architecture
- **Core Engine**: Spatial optimization algorithm for automatic îlot placement
- **File Processing**: DXF parser to extract floor plan geometry and zone information
- **Constraint System**: Rule engine to enforce placement restrictions
- **Algorithm Components**:
  - Zone detection (walls, restricted areas, entrances)
  - Space optimization for îlot placement
  - Corridor generation between facing îlot rows

## Key Components

### 1. Plan Loader
- **Purpose**: Parse and interpret architectural floor plans
- **Input**: DXF files or layered images
- **Output**: Structured data representing:
  - Walls (black lines)
  - Restricted areas (light blue - stairs, elevators)
  - Entrances/exits (red zones)

### 2. Zone Detection System
- **Algorithm**: Color-based or layer-based zone identification
- **Rationale**: Automated detection reduces manual input and ensures consistent constraint enforcement
- **Constraint Types**:
  - No-placement zones (red entrance/exit areas)
  - Restricted zones (blue areas for stairs/elevators)
  - Boundary walls (black lines - îlots can touch except near entrances)

### 3. Îlot Placement Engine
- **Algorithm**: Spatial optimization with constraint satisfaction
- **Input**: User-defined size distribution percentages
- **Process**:
  - Calculate total available space
  - Generate îlot quantities based on percentages
  - Place îlots using space-filling optimization
  - Validate all constraint compliance

### 4. Corridor Generation System
- **Purpose**: Automatically create corridors between facing îlot rows
- **Algorithm**: Detect opposing îlot rows and insert configurable-width corridors
- **Constraints**: Corridors must touch both rows without overlapping îlots

## Data Flow

1. **Input Stage**: User uploads DXF file and defines îlot size distribution
2. **Processing Stage**: 
   - Parse floor plan geometry
   - Detect and classify zones
   - Calculate îlot placement strategy
3. **Generation Stage**:
   - Place îlots according to size distribution
   - Generate required corridors
   - Validate constraint compliance
4. **Output Stage**: Display optimized layout with visual feedback

## External Dependencies

### File Processing
- **DXF Parser**: Library for reading AutoCAD DXF format files
- **Image Processing**: For layered image interpretation (if supported)

### Geometric Algorithms
- **Spatial Libraries**: For geometric calculations and collision detection
- **Optimization Engine**: For space-filling and constraint satisfaction

### Visualization
- **Canvas/SVG Rendering**: For displaying floor plans and îlot layouts
- **Interactive Graphics**: For user interaction with the generated layout

## Deployment Strategy

### Development Environment
- Local development server for real-time testing
- File upload handling for DXF processing
- Interactive preview capabilities

### Production Considerations
- File upload size limits for DXF files
- Processing timeout handling for complex floor plans
- Caching strategy for processed plans
- Error handling for invalid or corrupted DXF files

## User Preferences

Preferred communication style: Simple, everyday language.

## Changelog

```
Changelog:
- July 06, 2025. Initial setup
- July 06, 2025. Successfully cloned and set up Architectural_Space_Floor repository
- July 06, 2025. Fixed Express.js version compatibility (downgraded from v5 to v4.18)
- July 06, 2025. Installed all required dependencies and database schema
- July 06, 2025. Backend server running successfully on port 5000 with full features
```

## Technical Notes

### Algorithm Constraints
- Îlots cannot be placed in red (entrance/exit) zones
- Îlots cannot be placed in blue (restricted) zones  
- Îlots can touch black walls except near entrances
- Mandatory corridors required between facing îlot rows
- No overlapping between îlots allowed

### Performance Considerations
- Optimization algorithm may need timeout handling for large/complex plans
- Progressive rendering for real-time feedback during placement
- Configurable corridor width for different hotel requirements

### Future Enhancements
- Support for multiple floor plans
- Advanced îlot shape optimization
- Export functionality for generated layouts
- Integration with hotel management systems