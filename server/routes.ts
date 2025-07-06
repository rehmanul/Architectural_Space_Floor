import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { WebSocketServer } from 'ws';
import { Server } from 'http';
import { storage } from './storage';
import { FileProcessor } from './services/file-processor';
import { MLOptimizer } from './algorithms/ml-optimizer';
import { collaborationService } from './services/collaboration';
import { createSampleData } from './services/sample-data';
import { 
  insertProjectSchema, insertFloorPlanSchema, insertZoneSchema,
  insertIlotConfigurationSchema, insertGeneratedLayoutSchema,
  insertExportHistorySchema
} from '../shared/schema';
import { z } from 'zod';
import PDFDocument from 'pdfkit';

const router = express.Router();
const fileProcessor = new FileProcessor();
const mlOptimizer = new MLOptimizer();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.dxf', '.dwg', '.png', '.jpg', '.jpeg', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, allowedTypes.includes(ext));
  }
});

// Health check endpoint
router.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Projects API
router.get('/api/projects', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    let projects = await storage.getProjects(userId);
    
    // Create sample data for new users
    if (projects.length === 0) {
      await createSampleData(userId);
      projects = await storage.getProjects(userId);
    }
    
    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post('/api/projects', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const validation = insertProjectSchema.parse({ ...req.body, userId });
    const project = await storage.createProject(validation);
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
});

router.get('/api/projects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const project = await storage.getProject(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

router.put('/api/projects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const project = await storage.updateProject(id, updates);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/api/projects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.deleteProject(id);
    if (!success) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Floor Plans API
router.get('/api/projects/:projectId/floor-plans', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const floorPlans = await storage.getFloorPlans(projectId);
    res.json(floorPlans);
  } catch (error) {
    console.error('Error fetching floor plans:', error);
    res.status(500).json({ error: 'Failed to fetch floor plans' });
  }
});

router.post('/api/projects/:projectId/floor-plans', upload.single('file'), async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Process the uploaded file
    const fileBuffer = fs.readFileSync(file.path);
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    let processedData;
    if (fileExtension === '.dxf') {
      processedData = await fileProcessor.processDXF(fileBuffer);
    } else if (['.png', '.jpg', '.jpeg'].includes(fileExtension)) {
      processedData = await fileProcessor.processImage(fileBuffer);
    } else {
      throw new Error('Unsupported file type');
    }

    // Create floor plan record
    const floorPlanData = {
      projectId,
      name: req.body.name || path.parse(file.originalname).name,
      originalFileName: file.originalname,
      fileType: fileExtension.substring(1).toUpperCase(),
      filePath: file.path,
      fileSize: file.size,
      width: processedData.width,
      height: processedData.height,
      scale: parseFloat(req.body.scale) || 1.0,
      processed: true,
      processedAt: new Date(),
      analysisData: processedData.metadata
    };

    const floorPlan = await storage.createFloorPlan(floorPlanData);

    // Create zones from processed data
    const zones = [];
    for (const zoneData of processedData.zones) {
      const zone = await storage.createZone({
        floorPlanId: floorPlan.id,
        ...zoneData
      });
      zones.push(zone);
    }

    // Clean up uploaded file
    fs.unlinkSync(file.path);

    res.status(201).json({
      floorPlan,
      zones,
      analysisData: processedData.metadata
    });
  } catch (error) {
    console.error('Error processing floor plan:', error);
    // Clean up file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Failed to process floor plan' });
  }
});

router.get('/api/floor-plans/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const floorPlan = await storage.getFloorPlan(id);
    if (!floorPlan) {
      return res.status(404).json({ error: 'Floor plan not found' });
    }
    res.json(floorPlan);
  } catch (error) {
    console.error('Error fetching floor plan:', error);
    res.status(500).json({ error: 'Failed to fetch floor plan' });
  }
});

// Zones API
router.get('/api/floor-plans/:floorPlanId/zones', async (req, res) => {
  try {
    const floorPlanId = parseInt(req.params.floorPlanId);
    const zones = await storage.getZones(floorPlanId);
    res.json(zones);
  } catch (error) {
    console.error('Error fetching zones:', error);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

router.post('/api/floor-plans/:floorPlanId/zones', async (req, res) => {
  try {
    const floorPlanId = parseInt(req.params.floorPlanId);
    const validation = insertZoneSchema.parse({ 
      floorPlanId,
      ...req.body 
    });
    const zone = await storage.createZone(validation);
    res.status(201).json(zone);
  } catch (error) {
    console.error('Error creating zone:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create zone' });
    }
  }
});

router.put('/api/zones/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const zone = await storage.updateZone(id, updates);
    if (!zone) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.json(zone);
  } catch (error) {
    console.error('Error updating zone:', error);
    res.status(500).json({ error: 'Failed to update zone' });
  }
});

router.delete('/api/zones/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const success = await storage.deleteZone(id);
    if (!success) {
      return res.status(404).json({ error: 'Zone not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting zone:', error);
    res.status(500).json({ error: 'Failed to delete zone' });
  }
});

// Ilot Configurations API
router.get('/api/projects/:projectId/configurations', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const configurations = await storage.getIlotConfigurations(projectId);
    res.json(configurations);
  } catch (error) {
    console.error('Error fetching configurations:', error);
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

router.post('/api/projects/:projectId/configurations', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const validation = insertIlotConfigurationSchema.parse({
      projectId,
      ...req.body
    });
    const configuration = await storage.createIlotConfiguration(validation);
    res.status(201).json(configuration);
  } catch (error) {
    console.error('Error creating configuration:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create configuration' });
    }
  }
});

router.put('/api/configurations/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const configuration = await storage.updateIlotConfiguration(id, updates);
    if (!configuration) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    res.json(configuration);
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Layout Generation API
router.post('/api/floor-plans/:floorPlanId/generate-layout', async (req, res) => {
  try {
    const floorPlanId = parseInt(req.params.floorPlanId);
    const { configurationId, name } = req.body;

    // Get floor plan and configuration
    const floorPlan = await storage.getFloorPlan(floorPlanId);
    const configuration = await storage.getIlotConfiguration(configurationId);
    const zones = await storage.getZones(floorPlanId);

    if (!floorPlan || !configuration) {
      return res.status(404).json({ error: 'Floor plan or configuration not found' });
    }

    // Run ML optimization
    const optimizationResult = await mlOptimizer.optimizeLayout(
      zones,
      configuration,
      { width: floorPlan.width, height: floorPlan.height }
    );

    // Save generated layout
    const layoutData = {
      floorPlanId,
      configurationId,
      name: name || `Layout ${Date.now()}`,
      totalIlots: optimizationResult.ilots.length,
      totalArea: optimizationResult.totalArea,
      utilizationPercentage: optimizationResult.utilizationPercentage,
      ilotData: optimizationResult.ilots,
      corridorData: optimizationResult.corridors,
      optimizationScore: optimizationResult.score,
      generationTime: optimizationResult.generationTime,
      algorithm: optimizationResult.algorithm,
      status: 'completed'
    };

    const layout = await storage.createGeneratedLayout(layoutData);

    res.status(201).json({
      layout,
      ...optimizationResult
    });
  } catch (error) {
    console.error('Error generating layout:', error);
    res.status(500).json({ error: 'Failed to generate layout' });
  }
});

router.get('/api/floor-plans/:floorPlanId/layouts', async (req, res) => {
  try {
    const floorPlanId = parseInt(req.params.floorPlanId);
    const layouts = await storage.getGeneratedLayouts(floorPlanId);
    res.json(layouts);
  } catch (error) {
    console.error('Error fetching layouts:', error);
    res.status(500).json({ error: 'Failed to fetch layouts' });
  }
});

router.get('/api/layouts/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const layout = await storage.getGeneratedLayout(id);
    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }
    res.json(layout);
  } catch (error) {
    console.error('Error fetching layout:', error);
    res.status(500).json({ error: 'Failed to fetch layout' });
  }
});

// Export API
router.post('/api/layouts/:id/export', async (req, res) => {
  try {
    const layoutId = parseInt(req.params.id);
    const { exportType, settings } = req.body;
    const userId = req.headers['x-user-id'] as string || 'default-user';

    const layout = await storage.getGeneratedLayout(layoutId);
    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    let exportPath: string;
    let fileName: string;

    switch (exportType) {
      case 'pdf':
        fileName = `layout_${layoutId}_${Date.now()}.pdf`;
        exportPath = path.join('exports', fileName);
        await generatePDFExport(layout, exportPath, settings);
        break;

      case 'png':
        fileName = `layout_${layoutId}_${Date.now()}.png`;
        exportPath = path.join('exports', fileName);
        await generateImageExport(layout, exportPath, settings);
        break;

      case 'json':
        fileName = `layout_${layoutId}_${Date.now()}.json`;
        exportPath = path.join('exports', fileName);
        await generateJSONExport(layout, exportPath, settings);
        break;

      default:
        return res.status(400).json({ error: 'Unsupported export type' });
    }

    // Create export history record
    const exportRecord = await storage.createExportHistory({
      layoutId,
      userId,
      exportType,
      fileName,
      filePath: exportPath,
      fileSize: fs.statSync(exportPath).size,
      settings
    });

    // Send file
    res.download(exportPath, fileName);
  } catch (error) {
    console.error('Error exporting layout:', error);
    res.status(500).json({ error: 'Failed to export layout' });
  }
});

// Collaboration API
router.post('/api/projects/:projectId/collaboration/start', async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const userName = req.body.userName || 'Anonymous';

    const sessionId = await collaborationService.createSession(projectId, userId, userName);
    res.status(201).json({ sessionId });
  } catch (error) {
    console.error('Error starting collaboration:', error);
    res.status(500).json({ error: 'Failed to start collaboration session' });
  }
});

router.post('/api/collaboration/:sessionId/join', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const userId = req.headers['x-user-id'] as string || 'default-user';
    const { userName, role } = req.body;

    // This endpoint returns session info, actual WebSocket joining happens in WebSocket handler
    const sessionInfo = collaborationService.getSessionInfo(sessionId);
    if (!sessionInfo) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId,
      projectId: sessionInfo.projectId,
      participantCount: sessionInfo.participants.size,
      canJoin: true
    });
  } catch (error) {
    console.error('Error checking collaboration session:', error);
    res.status(500).json({ error: 'Failed to check session' });
  }
});

router.get('/api/collaboration/active', async (req, res) => {
  try {
    const sessions = collaborationService.getActiveSessions();
    const sessionSummaries = sessions.map(session => ({
      sessionId: session.sessionId,
      projectId: session.projectId,
      participantCount: session.participants.size,
      lastActivity: session.lastActivity
    }));
    res.json(sessionSummaries);
  } catch (error) {
    console.error('Error fetching active sessions:', error);
    res.status(500).json({ error: 'Failed to fetch active sessions' });
  }
});

// Export helper functions
async function generatePDFExport(layout: any, filePath: string, settings: any): Promise<void> {
  const doc = new PDFDocument();
  
  // Ensure exports directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  // Add title
  doc.fontSize(20).text(`Layout Export - ${layout.name}`, 50, 50);
  
  // Add layout information
  doc.fontSize(12)
     .text(`Total Ilots: ${layout.totalIlots}`, 50, 100)
     .text(`Total Area: ${layout.totalArea.toFixed(2)} m²`, 50, 120)
     .text(`Utilization: ${layout.utilizationPercentage.toFixed(1)}%`, 50, 140)
     .text(`Optimization Score: ${layout.optimizationScore.toFixed(1)}`, 50, 160)
     .text(`Generation Time: ${layout.generationTime.toFixed(2)}s`, 50, 180);

  // Draw ilots and corridors
  const scale = 2; // Scale factor for PDF
  const offsetX = 50;
  const offsetY = 220;

  // Draw ilots
  const ilots = layout.ilotData as any[];
  for (const ilot of ilots) {
    doc.rect(
      offsetX + ilot.x * scale,
      offsetY + ilot.y * scale,
      ilot.width * scale,
      ilot.height * scale
    ).stroke();
    
    // Add ilot label
    doc.fontSize(8).text(
      `${ilot.area?.toFixed(1)}m²`,
      offsetX + ilot.x * scale + 2,
      offsetY + ilot.y * scale + 2
    );
  }

  // Draw corridors
  const corridors = layout.corridorData as any[];
  for (const corridor of corridors) {
    doc.fillColor('lightgray')
       .rect(
         offsetX + corridor.x * scale,
         offsetY + corridor.y * scale,
         corridor.width * scale,
         corridor.height * scale
       ).fill();
  }

  doc.end();
  
  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function generateImageExport(layout: any, filePath: string, settings: any): Promise<void> {
  // This would implement image generation using Canvas or similar
  // For now, create a simple JSON export
  await generateJSONExport(layout, filePath.replace('.png', '.json'), settings);
}

async function generateJSONExport(layout: any, filePath: string, settings: any): Promise<void> {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  const exportData = {
    layout,
    exportSettings: settings,
    exportedAt: new Date().toISOString()
  };
  
  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
}

// WebSocket setup for real-time collaboration
export function setupWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('WebSocket connection established');

    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'join_collaboration') {
          const { sessionId, userId, userName, role } = message.data;
          
          await collaborationService.joinSession(
            sessionId,
            userId,
            userName,
            ws,
            role
          );
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
}

export default router;