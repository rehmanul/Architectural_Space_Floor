
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus, Move, Edit } from 'lucide-react';
import type { Zone, FloorPlan } from '@shared/schema';

interface ZoneEditorProps {
  floorPlan: FloorPlan;
  zones: Zone[];
  onZoneUpdate: (zones: Zone[]) => void;
  onZoneAdd: (zone: Omit<Zone, 'id'>) => void;
  onZoneDelete: (zoneId: number) => void;
}

interface Point {
  x: number;
  y: number;
}

export function ZoneEditor({ floorPlan, zones, onZoneUpdate, onZoneAdd, onZoneDelete }: ZoneEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [selectedZoneType, setSelectedZoneType] = useState<'wall' | 'restricted' | 'entrance' | 'exit'>('wall');
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw floor plan background if available
    if (floorPlan.imageUrl) {
      const img = new Image();
      img.onload = () => {
        const scaleX = canvas.width / img.width;
        const scaleY = canvas.height / img.height;
        setScale(Math.min(scaleX, scaleY));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        drawZones(ctx);
      };
      img.src = floorPlan.imageUrl;
    } else {
      drawZones(ctx);
    }
  }, [floorPlan, zones, selectedZone]);

  const drawZones = (ctx: CanvasRenderingContext2D) => {
    zones.forEach((zone) => {
      const coordinates = zone.coordinates as Point[];
      if (!coordinates || coordinates.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(coordinates[0].x * scale, coordinates[0].y * scale);
      
      coordinates.forEach((point, index) => {
        if (index > 0) {
          ctx.lineTo(point.x * scale, point.y * scale);
        }
      });

      if (coordinates.length > 2) {
        ctx.closePath();
      }

      // Set colors based on zone type
      switch (zone.type) {
        case 'wall':
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.stroke();
          break;
        case 'restricted':
          ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();
          break;
        case 'entrance':
        case 'exit':
          ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.fill();
          ctx.stroke();
          break;
      }

      // Highlight selected zone
      if (selectedZone === zone.id) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    });

    // Draw current drawing points
    if (currentPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      currentPoints.forEach((point, index) => {
        if (index > 0) {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw points
      currentPoints.forEach((point) => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = '#10b981';
        ctx.fill();
      });
    }
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (isDrawing) {
      setCurrentPoints([...currentPoints, { x, y }]);
    } else {
      // Check if clicking on existing zone
      const clickedZone = zones.find((zone) => {
        const coordinates = zone.coordinates as Point[];
        return isPointInPolygon({ x: x / scale, y: y / scale }, coordinates);
      });

      if (clickedZone) {
        setSelectedZone(clickedZone.id);
      } else {
        setSelectedZone(null);
      }
    }
  };

  const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      if (
        polygon[i].y > point.y !== polygon[j].y > point.y &&
        point.x < ((polygon[j].x - polygon[i].x) * (point.y - polygon[i].y)) / (polygon[j].y - polygon[i].y) + polygon[i].x
      ) {
        inside = !inside;
      }
    }
    return inside;
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setCurrentPoints([]);
    setSelectedZone(null);
  };

  const finishDrawing = () => {
    if (currentPoints.length < 2) return;

    const scaledPoints = currentPoints.map((point) => ({
      x: point.x / scale,
      y: point.y / scale,
    }));

    onZoneAdd({
      floorPlanId: floorPlan.id,
      type: selectedZoneType,
      coordinates: scaledPoints,
      area: calculatePolygonArea(scaledPoints),
      color: getZoneColor(selectedZoneType),
    });

    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const cancelDrawing = () => {
    setIsDrawing(false);
    setCurrentPoints([]);
  };

  const calculatePolygonArea = (points: Point[]): number => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area) / 2;
  };

  const getZoneColor = (type: string): string => {
    switch (type) {
      case 'wall': return '#000000';
      case 'restricted': return '#3b82f6';
      case 'entrance':
      case 'exit': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getZoneTypeLabel = (type: string): string => {
    switch (type) {
      case 'wall': return 'Wall';
      case 'restricted': return 'Restricted Area';
      case 'entrance': return 'Entrance';
      case 'exit': return 'Exit';
      default: return type;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Zone Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="border border-border rounded-lg cursor-crosshair w-full max-w-full"
              onClick={handleCanvasClick}
            />
            
            {isDrawing && (
              <div className="mt-4 flex gap-2">
                <Button onClick={finishDrawing} size="sm">
                  Finish Zone
                </Button>
                <Button onClick={cancelDrawing} variant="outline" size="sm">
                  Cancel
                </Button>
                <span className="text-sm text-muted-foreground py-2">
                  Click to add points. Click "Finish Zone" when done.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Add Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Zone Type</label>
              <Select value={selectedZoneType} onValueChange={(value) => setSelectedZoneType(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wall">Wall</SelectItem>
                  <SelectItem value="restricted">Restricted Area</SelectItem>
                  <SelectItem value="entrance">Entrance</SelectItem>
                  <SelectItem value="exit">Exit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={startDrawing} disabled={isDrawing} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              {isDrawing ? 'Drawing...' : 'Start Drawing Zone'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Existing Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedZone === zone.id ? 'border-amber-500 bg-amber-50' : 'border-border hover:bg-accent'
                  }`}
                  onClick={() => setSelectedZone(zone.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: zone.color }}
                      />
                      <div>
                        <div className="font-medium text-sm">
                          {getZoneTypeLabel(zone.type)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {zone.area?.toFixed(1)}m²
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onZoneDelete(zone.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {zones.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No zones defined yet. Start by drawing your first zone.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
