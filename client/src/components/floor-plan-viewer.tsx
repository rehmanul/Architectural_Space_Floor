import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { FloorPlan, Zone } from '@shared/schema';

interface FloorPlanViewerProps {
  floorPlan: FloorPlan;
  zones: Zone[];
  className?: string;
  onPointClick?: (point: { x: number; y: number }) => void;
}

export function FloorPlanViewer({ 
  floorPlan, 
  zones, 
  className,
  onPointClick 
}: FloorPlanViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
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

  // Initialize scale and offset to fit floor plan
  useEffect(() => {
    if (floorPlan && dimensions.width > 0 && dimensions.height > 0) {
      const padding = 50;
      const scaleX = (dimensions.width - padding * 2) / floorPlan.width;
      const scaleY = (dimensions.height - padding * 2) / floorPlan.height;
      const newScale = Math.min(scaleX, scaleY, 2); // Max scale of 2x
      
      setScale(newScale);
      setOffset({
        x: (dimensions.width - floorPlan.width * newScale) / 2,
        y: (dimensions.height - floorPlan.height * newScale) / 2
      });
    }
  }, [floorPlan, dimensions]);

  // Render floor plan and zones
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !floorPlan) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // Clear canvas
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Save context state
    ctx.save();

    // Apply transform
    ctx.translate(offset.x, offset.y);
    ctx.scale(scale, scale);

    // Draw floor plan background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, floorPlan.width, floorPlan.height);

    // Draw zones
    zones.forEach(zone => {
      const coordinates = zone.coordinates as { x: number; y: number }[];
      if (!coordinates || coordinates.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(coordinates[0].x, coordinates[0].y);
      
      for (let i = 1; i < coordinates.length; i++) {
        ctx.lineTo(coordinates[i].x, coordinates[i].y);
      }
      
      // Close path if it's a polygon
      if (coordinates.length > 2) {
        ctx.closePath();
      }

      // Set style based on zone type
      switch (zone.type) {
        case 'wall':
          ctx.strokeStyle = zone.color || '#000000';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        case 'restricted':
          ctx.fillStyle = zone.color || '#00BFFF';
          ctx.globalAlpha = 0.3;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = zone.color || '#00BFFF';
          ctx.lineWidth = 1;
          ctx.stroke();
          break;
        case 'entrance':
        case 'exit':
          ctx.fillStyle = zone.color || '#FF0000';
          ctx.globalAlpha = 0.3;
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = zone.color || '#FF0000';
          ctx.lineWidth = 1;
          ctx.stroke();
          break;
        default:
          ctx.strokeStyle = zone.color || '#808080';
          ctx.lineWidth = 1;
          ctx.stroke();
      }
    });

    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.5;
    
    const gridSize = 5; // 5 meter grid
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

    // Restore context state
    ctx.restore();

    // Draw scale indicator
    drawScaleIndicator(ctx);
    
  }, [floorPlan, zones, dimensions, scale, offset]);

  const drawScaleIndicator = (ctx: CanvasRenderingContext2D) => {
    const scaleLength = 50; // pixels
    const realLength = scaleLength / scale; // real world units
    const roundedLength = Math.round(realLength);
    
    ctx.save();
    ctx.strokeStyle = '#333333';
    ctx.fillStyle = '#333333';
    ctx.lineWidth = 2;
    ctx.font = '12px sans-serif';
    
    const x = 20;
    const y = dimensions.height - 30;
    
    // Draw scale line
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + scaleLength, y);
    ctx.stroke();
    
    // Draw end markers
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x, y + 5);
    ctx.moveTo(x + scaleLength, y - 5);
    ctx.lineTo(x + scaleLength, y + 5);
    ctx.stroke();
    
    // Draw label
    ctx.fillText(`${roundedLength}m`, x + scaleLength / 2 - 10, y - 8);
    
    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      setOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onPointClick || isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - offset.x) / scale;
    const y = (e.clientY - rect.top - offset.y) / scale;

    onPointClick({ x, y });
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

    // Zoom towards mouse position
    const scaleChange = newScale / scale;
    setOffset(prev => ({
      x: mouseX - (mouseX - prev.x) * scaleChange,
      y: mouseY - (mouseY - prev.y) * scaleChange
    }));

    setScale(newScale);
  };

  return (
    <div 
      ref={containerRef}
      className={cn('relative overflow-hidden bg-gray-50', className)}
    >
      <canvas
        ref={canvasRef}
        className="floor-plan-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
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
      
      {/* Status Info */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur px-3 py-2 rounded shadow text-sm">
        <div>Scale: {(scale * 100).toFixed(0)}%</div>
        <div>Size: {floorPlan.width.toFixed(1)} × {floorPlan.height.toFixed(1)}m</div>
        <div>Zones: {zones.length}</div>
      </div>
    </div>
  );
}