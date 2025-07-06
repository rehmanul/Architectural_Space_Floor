# Render.com Deployment Guide

## Quick Deploy

1. **Connect Repository**: Link your GitHub repository to Render.com
2. **Create Web Service**: Use the `render.yaml` configuration
3. **Set Environment Variables**: Database URL will be automatically injected

## Manual Deployment Steps

### 1. Database Setup
- Create a PostgreSQL database on Render.com
- Note the connection string for environment variables

### 2. Web Service Configuration
```yaml
Build Command: npm install && npm run build
Start Command: npm start
Environment: Node.js
Plan: Starter (or higher)
```

### 3. Environment Variables
```
NODE_ENV=production
PORT=10000
DATABASE_URL=[Auto-injected by Render]
```

### 4. Health Check
- Health check endpoint: `/api/health`
- Expected response: `200 OK`

## Build Process

The application uses a multi-stage build:
1. Install dependencies
2. Build client (React/Vite)
3. Build server (TypeScript)
4. Create production bundle

## Features Enabled in Production

- ✅ File upload processing (DXF, CAD, Images)
- ✅ AI-powered layout optimization
- ✅ Real-time collaboration via WebSocket
- ✅ 3D visualization rendering
- ✅ PDF/Image export functionality
- ✅ Database persistence
- ✅ Comprehensive error handling

## Performance Optimizations

- Static file serving with compression
- Database connection pooling
- Memory-efficient ML processing
- Optimized bundle sizes
- CDN-ready asset delivery

## Monitoring

- Health check: `GET /api/health`
- Logs: Available in Render dashboard
- Metrics: Response time, memory usage, error rates

## Scaling Considerations

- Horizontal scaling supported
- Database connection limits
- File storage considerations
- WebSocket connection management

## Security Features

- CORS protection
- Rate limiting
- Input validation
- SQL injection prevention
- File upload restrictions