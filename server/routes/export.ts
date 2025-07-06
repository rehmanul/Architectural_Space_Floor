
import express from 'express';
import { storage } from '../storage';
import { MLOptimizer } from '../algorithms/ml-optimizer';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// Export layout in various formats
router.post('/api/floor-plans/:floorPlanId/layouts/:layoutId/export', async (req, res) => {
  try {
    const { floorPlanId, layoutId } = req.params;
    const { format, options } = req.body;

    // Get layout data
    const layout = await storage.getGeneratedLayout(parseInt(layoutId));
    if (!layout) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const floorPlan = await storage.getFloorPlan(parseInt(floorPlanId));
    if (!floorPlan) {
      return res.status(404).json({ error: 'Floor plan not found' });
    }

    const zones = await storage.getZonesByFloorPlan(parseInt(floorPlanId));

    let exportData: Buffer | string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case 'json':
        exportData = JSON.stringify({
          layout,
          floorPlan: options.includeZones ? { ...floorPlan, zones } : floorPlan,
          metadata: {
            exportDate: new Date().toISOString(),
            options
          }
        }, null, 2);
        contentType = 'application/json';
        filename = `layout-${layoutId}.json`;
        break;

      case 'pdf':
        exportData = await generatePDFExport(layout, floorPlan, zones, options);
        contentType = 'application/pdf';
        filename = `layout-${layoutId}.pdf`;
        break;

      case 'png':
        exportData = await generateImageExport(layout, floorPlan, zones, options);
        contentType = 'image/png';
        filename = `layout-${layoutId}.png`;
        break;

      case 'dxf':
        exportData = await generateDXFExport(layout, floorPlan, zones, options);
        contentType = 'application/dxf';
        filename = `layout-${layoutId}.dxf`;
        break;

      default:
        return res.status(400).json({ error: 'Unsupported export format' });
    }

    // Save export record
    await storage.createExportRecord({
      layoutId: parseInt(layoutId),
      format,
      options,
      filename
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (typeof exportData === 'string') {
      res.send(exportData);
    } else {
      res.send(exportData);
    }

  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Export failed' });
  }
});

// Generate PDF export
async function generatePDFExport(layout: any, floorPlan: any, zones: any[], options: any): Promise<Buffer> {
  // This would use a PDF library like puppeteer or jsPDF
  // For now, return a simple text representation
  const content = `
Layout Export - ${new Date().toISOString()}

Floor Plan: ${floorPlan.name}
Total Rooms: ${layout.totalIlots}
Total Area: ${layout.totalArea.toFixed(1)}m²
Utilization: ${layout.utilizationPercentage.toFixed(1)}%
Algorithm: ${layout.algorithm}
Generation Time: ${layout.generationTime.toFixed(2)}s

${options.includeStatistics ? `
Statistics:
- Room count: ${layout.ilots?.length || 0}
- Corridor count: ${layout.corridors?.length || 0}
- Optimization score: ${layout.optimizationScore ? (layout.optimizationScore * 100).toFixed(1) + '%' : 'N/A'}
` : ''}

${options.includeZones ? `
Zones:
${zones.map(zone => `- ${zone.type}: ${zone.area?.toFixed(1) || 0}m²`).join('\n')}
` : ''}
  `;

  return Buffer.from(content, 'utf-8');
}

// Generate image export
async function generateImageExport(layout: any, floorPlan: any, zones: any[], options: any): Promise<Buffer> {
  // This would use a canvas library to render the layout
  // For now, return a placeholder
  const width = 800;
  const height = 600;
  const canvas = Buffer.alloc(width * height * 4); // RGBA
  return canvas;
}

// Generate DXF export
async function generateDXFExport(layout: any, floorPlan: any, zones: any[], options: any): Promise<string> {
  // This would generate actual DXF format
  // For now, return a simplified DXF structure
  let dxf = `0
SECTION
2
ENTITIES
`;

  if (options.includeZones) {
    zones.forEach((zone, index) => {
      const coordinates = zone.coordinates as Array<{x: number, y: number}>;
      if (coordinates && coordinates.length > 0) {
        dxf += `0
LWPOLYLINE
8
ZONES
62
${zone.type === 'wall' ? '0' : zone.type === 'restricted' ? '5' : '1'}
90
${coordinates.length}
`;
        coordinates.forEach(point => {
          dxf += `10
${point.x}
20
${point.y}
`;
        });
      }
    });
  }

  if (layout.ilots) {
    layout.ilots.forEach((ilot: any, index: number) => {
      dxf += `0
LWPOLYLINE
8
ILOTS
62
2
90
5
10
${ilot.x}
20
${ilot.y}
10
${ilot.x + ilot.width}
20
${ilot.y}
10
${ilot.x + ilot.width}
20
${ilot.y + ilot.height}
10
${ilot.x}
20
${ilot.y + ilot.height}
10
${ilot.x}
20
${ilot.y}
`;
    });
  }

  dxf += `0
ENDSEC
0
EOF
`;

  return dxf;
}

export default router;
