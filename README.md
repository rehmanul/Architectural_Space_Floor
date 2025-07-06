# Architectural Space Analyzer

Advanced architectural space analysis application with AI-powered optimization, real-time collaboration, and 3D visualization capabilities.

## Features

### 🏗️ Core Functionality
- **DXF/CAD File Processing**: Upload and analyze floor plans automatically
- **Zone Detection**: Automatic identification of walls, restricted areas, and entrances
- **AI Layout Optimization**: Machine learning-powered room placement using genetic algorithms
- **Real-time Collaboration**: Live cursor tracking and synchronized editing
- **3D Visualization**: Advanced WebGL rendering with interactive navigation
- **Export Capabilities**: PDF, image, and JSON export options

### 🤖 AI & Machine Learning
- TensorFlow.js integration for optimization scoring
- Genetic algorithm for spatial optimization
- Constraint satisfaction solving
- Multi-criteria optimization (space utilization, accessibility, energy efficiency)

### 🔄 Real-time Features
- WebSocket-based collaboration
- Live cursor and selection tracking
- Role-based permissions (host, editor, viewer)
- Instant layout updates across all participants

### 📊 Advanced Analytics
- Space utilization metrics
- Optimization scoring
- Performance analytics
- Generation time tracking

## Quick Start

### Development
```bash
npm install
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## Deployment

### Render.com (Recommended)
1. Connect your GitHub repository to Render.com
2. Use the provided `render.yaml` configuration
3. Set environment variables (DATABASE_URL auto-injected)
4. Deploy with automatic builds

### Manual Deployment
```bash
chmod +x scripts/build.sh scripts/start.sh
./scripts/build.sh
./scripts/start.sh
```

## Environment Variables

### Required
- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: production
- `PORT`: Application port (default: 10000)

### Optional
- `MAX_FILE_SIZE`: File upload limit (default: 50MB)
- `ML_TIMEOUT`: ML processing timeout (default: 120s)
- `CORS_ORIGIN`: CORS configuration

## API Endpoints

### Health Check
- `GET /api/health` - Application health status

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details

### Floor Plans
- `GET /api/projects/:id/floor-plans` - List floor plans
- `POST /api/projects/:id/floor-plans` - Upload floor plan
- `GET /api/floor-plans/:id` - Get floor plan details

### Layout Generation
- `POST /api/floor-plans/:id/generate-layout` - Generate optimized layout
- `GET /api/floor-plans/:id/layouts` - List generated layouts

### Collaboration
- `POST /api/projects/:id/collaboration/start` - Start collaboration session
- `WebSocket /ws` - Real-time collaboration endpoint

## File Formats Supported

### Input
- **DXF**: AutoCAD Drawing Exchange Format
- **DWG**: AutoCAD Drawing files
- **PNG/JPG**: Floor plan images with color-coded zones
- **PDF**: Architectural drawings

### Output
- **PDF**: Publication-ready layouts
- **PNG**: High-resolution images
- **JSON**: Layout data for integration
- **DXF**: CAD-compatible exports

## Architecture

### Frontend
- React 18 with TypeScript
- Vite for fast development and optimized builds
- TailwindCSS for styling
- React Query for state management
- Wouter for routing

### Backend
- Node.js with Express
- TypeScript for type safety
- PostgreSQL with Drizzle ORM
- WebSocket for real-time features
- TensorFlow.js for ML processing

### Database Schema
- Projects and floor plans management
- Zone and layout data storage
- Collaboration session tracking
- Export history and analytics

## Performance

### Optimizations
- Static file serving with compression
- Database connection pooling
- Memory-efficient ML processing
- Optimized bundle sizes
- CDN-ready asset delivery

### Monitoring
- Health check endpoint
- Comprehensive error logging
- Performance metrics tracking
- Real-time status monitoring

## Security

- CORS protection
- Rate limiting
- Input validation and sanitization
- SQL injection prevention
- File upload restrictions
- Secure WebSocket connections

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the documentation
- Review API endpoints
- Check deployment guide
- Contact support team