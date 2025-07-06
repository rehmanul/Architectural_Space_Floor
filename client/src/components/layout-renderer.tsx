import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { FloorPlan, Zone, GeneratedLayout } from '@shared/schema';

interface LayoutRendererProps {
  floorPlan: FloorPlan;
  zones: Zone[];
  layout: GeneratedLayout;
  className?: string;
}

interface Ilot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  sizeCategory: string;
  rotation: number;
}

interface Corridor {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'horizontal' | 'vertical';
  connectedIlots: string[];
}

export function LayoutRenderer({ floorPlan, zones, layout, className }: LayoutRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [selectedIlot, setSelectedIlot] = useState<string | null>(null);
  const [hoveredIlot, setHoveredIlot] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Update canvas dimensions on container resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Initialize scale and offset
  useEffect(() => {
    if (floorPlan && dimensions.width > 0 && dimensions.height > 0) {
      const padding = 50;
      const scaleX = (dimensions.width - padding * 2) / floorPlan.width;
      const scaleY = (dimensions.height - padding * 2) / floorPlan.height;
      const newScale = Math.min(scaleX, scaleY, 2);
      
      setScale(newScale);
      setOffset({
        x: (dimensions.width - floorPlan.width * newScale) / 2,
        y: (dimensions.height - floorPlan.height * newScale) / 2
      });
    }
  }, [floorPlan, dimensions]);

  // Main render function
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !floorPlan || !layout) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);
    ctx.save();
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw floor plan background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, floorPlan.width, floorPlan.height);

    // Draw zones (walls, restricted areas, entrances)
    drawZones(ctx, zones);

    // Draw corridors
    const corridors = layout.corridorData as Corridor[];
    drawCorridors(ctx, corridors);

    // Draw ilots
    const ilots = layout.ilotData as Ilot[];
    drawIlots(ctx, ilots);

    // Draw grid
    drawGrid(ctx, floorPlan);

    ctx.restore();

    // Draw UI elements
    drawScaleIndicator(ctx);
    drawLayoutInfo(ctx, layout);

  }, [floorPlan, zones, layout, dimensions, scale, offset, selectedIlot, hoveredIlot]);

  const drawZones = (ctx: CanvasRenderingContext2D, zones: Zone[]) => {
    zones.forEach(zone => {
      const coordinates = zone.coordinates as { x: number; y: number }[];
      if (!coordinates || coordinates.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(coordinates[0].x, coordinates[0].y);
      
      for (let i = 1; i < coordinates.length; i++) {
        ctx.lineTo(coordinates[i].x, coordinates[i].y);
      }
      
      if (coordinates.length > 2) {
        ctx.closePath();
      }

      switch (zone.type) {
        case 'wall':
          ctx.strokeStyle = zone.color || '#000000';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        case 'restricted':
          ctx.fillStyle = zone.color || '#00BFFF';
          ctx.globalAlpha = 0.2;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = zone.color || '#00BFFF';
          ctx.lineWidth = 1;
          ctx.stroke();
          break;
        case 'entrance':
        case 'exit':
          ctx.fillStyle = zone.color || '#FF0000';
          ctx.globalAlpha = 0.2;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = zone.color || '#FF0000';
          ctx.lineWidth = 1;
          ctx.stroke();
          break;
      }
    });
  };

  const drawCorridors = (ctx: CanvasRenderingContext2D, corridors: Corridor[]) => {
    corridors.forEach(corridor => {
      ctx.fillStyle = '#e5e7eb';
      ctx.globalAlpha = 0.7;
      ctx.fillRect(corridor.x, corridor.y, corridor.width, corridor.height);
      
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#9ca3af';
      ctx.lineWidth = 1;
      ctx.strokeRect(corridor.x, corridor.y, corridor.width, corridor.height);

      // Add corridor label
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        'Corridor',
        corridor.x + corridor.width / 2,
        corridor.y + corridor.height / 2 + 4
      );
    });
  };

  const drawIlots = (ctx: CanvasRenderingContext2D, ilots: Ilot[]) => {
    ilots.forEach(ilot => {
      const isSelected = selectedIlot === ilot.id;
      const isHovered = hoveredIlot === ilot.id;

      // Draw ilot rectangle
      if (isSelected) {
        ctx.fillStyle = '#10b981';
      } else if (isHovered) {
        ctx.fillStyle = '#fbbf24';
      } else {
        ctx.fillStyle = '#ddd6fe';
      }

      ctx.fillRect(ilot.x, ilot.y, ilot.width, ilot.height);

      // Draw border
      ctx.strokeStyle = isSelected ? '#059669' : isHovered ? '#f59e0b' : '#8b5cf6';
      ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1;
      ctx.strokeRect(ilot.x, ilot.y, ilot.width, ilot.height);

      // Draw ilot label
      ctx.fillStyle = '#374151';
      ctx.font = isSelected ? 'bold 10px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'center';
      
      const centerX = ilot.x + ilot.width / 2;
      const centerY = ilot.y + ilot.height / 2;
      
      // Area label
      ctx.fillText(
        `${ilot.area.toFixed(1)}m²`,
        centerX,
        centerY - 2
      );
      
      // Size category (if there's space)
      if (ilot.height > 30) {
        ctx.font = '8px sans-serif';
        ctx.fillText(
          ilot.sizeCategory,
          centerX,
          centerY + 12
        );
      }
    });
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, floorPlan: FloorPlan) => {
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.5;
    
    const gridSize = 5;
    for (let x = 0; x <= floorPlan.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, floorPlan.height);
      ctx.stroke();
    }
    
    for (let y = 0; y <= floorPlan.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(floorPlan.width, y);
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
  };

  const drawScaleIndicator = (ctx: CanvasRenderingContext2D) => {
    const scaleLength = 50;
    const realLength = scaleLength / scale;
    const roundedLength = Math.round(realLength);
    
    ctx.save();
    ctx.strokeStyle = '#374151';
    ctx.fillStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.font = '12px sans-serif';
    
    const x = 20;
    const y = dimensions.height - 30;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + scaleLength, y);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.moveTo(x + scaleLength, y - 5);
    ctx.lineTo(x + scaleLength, y + 5);
    ctx.stroke();
    
    ctx.fillText(`${roundedLength}m`, x + scaleLength / 2 - 10, y - 8);
    ctx.restore();
  };

  const drawLayoutInfo = (ctx: CanvasRenderingContext2D, layout: GeneratedLayout) => {
    const info = [
      `Layout: ${layout.name}`,
      `Rooms: ${layout.totalIlots}`,
      `Utilization: ${layout.utilizationPercentage.toFixed(1)}%`,
      `Score: ${layout.optimizationScore?.toFixed(1) || 'N/A'}`,
    ];

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(dimensions.width - 200, 10, 190, info.length * 20 + 10);
    
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    ctx.strokeRect(dimensions.width - 200, 10, 190, info.length * 20 + 10);
    
    ctx.fillStyle = '#374151';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    
    info.forEach((text, index) => {
      ctx.fillText(text, dimensions.width - 190, 30 + index * 20);
    });
    
    ctx.restore();
  };

  const getIlotAtPoint = (x: number, y: number): string | null => {
    const ilots = layout.ilotData as Ilot[];
    const worldX = (x - offset.x) / scale;
    const worldY = (y - offset.y) / scale;

    for (const ilot of ilots) {
      if (
        worldX >= ilot.x &&
        worldX <= ilot.x + ilot.width &&
        worldY >= ilot.y &&
        worldY <= ilot.y + ilot.height
      ) {
        return ilot.id;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ilotId = getIlotAtPoint(x, y);
    if (ilotId) {
      setSelectedIlot(selectedIlot === ilotId ? null : ilotId);
    } else {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      setOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else {
      const ilotId = getIlotAtPoint(x, y);
      setHoveredIlot(ilotId);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(scale * scaleFactor, 0.1), 5);

    const scaleChange = newScale / scale;
    setOffset(prev => ({
      x: mouseX - (mouseX - prev.x) * scaleChange,
      y: mouseY - (mouseY - prev.y) * scaleChange
    }));

    setScale(newScale);
  };

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden bg-gray-50', className)}>
      <canvas
        ref={canvasRef}
        className="floor-plan-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      />
      
      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          className="w-8 h-8 bg-white border rounded shadow hover:bg-gray-50 flex items-center justify-center"
          onClick={() => setScale(prev => Math.min(prev * 1.2, 5))}
        >
          +
        </button>
        <button
          className="w-8 h-8 bg-white border rounded shadow hover:bg-gray-50 flex items-center justify-center"
          onClick={() => setScale(prev => Math.max(prev * 0.8, 0.1))}
        >
          −
        </button>
        <button
          className="w-8 h-8 bg-white border rounded shadow hover:bg-gray-50 flex items-center justify-center text-xs"
          onClick={() => {
            const padding = 50;
            const scaleX = (dimensions.width - padding * 2) / floorPlan.width;
            const scaleY = (dimensions.height - padding * 2) / floorPlan.height;
            const newScale = Math.min(scaleX, scaleY, 2);
            
            setScale(newScale);
            setOffset({
              x: (dimensions.width - floorPlan.width * newScale) / 2,
              y: (dimensions.height - floorPlan.height * newScale) / 2
            });
          }}
          title="Fit to view"
        >
          ⌂
        </button>
      </div>
    </div>
  );
}