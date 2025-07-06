import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { ArrowLeft, Maximize2, Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FloorPlan3DViewer } from '@/components/floor-plan-3d-viewer';
import type { FloorPlan, Zone } from '@shared/schema';

export function FloorPlanPage() {
  const { id } = useParams();
  const floorPlanId = parseInt(id!);
  const [view3D, setView3D] = useState(false);

  const { data: floorPlan, isLoading } = useQuery<FloorPlan>({
    queryKey: ['/api/floor-plans', floorPlanId],
    enabled: !!floorPlanId,
  });

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: [`/api/floor-plans/${floorPlanId}/zones`],
    enabled: !!floorPlanId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!floorPlan) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Floor plan not found</h1>
        <Link href="/projects">
          <Button>Back to Projects</Button>
        </Link>
      </div>
    );
  }

  const zonesByType = zones.reduce((acc, zone) => {
    if (!acc[zone.type]) acc[zone.type] = [];
    acc[zone.type].push(zone);
    return acc;
  }, {} as Record<string, Zone[]>);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href={`/projects/${floorPlan.projectId}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Project
          </Button>
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">{floorPlan.name}</h1>
            <p className="text-muted-foreground">
              {floorPlan.width.toFixed(1)} × {floorPlan.height.toFixed(1)} meters
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setView3D(!view3D)}>
              <Maximize2 className="w-4 h-4 mr-2" />
              {view3D ? '2D View' : '3D View'}
            </Button>
            <Link href={`/layout-generator/${floorPlanId}`}>
              <Button>Generate Layout</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <Card className="h-[600px]">
            <CardContent className="p-0 h-full">
              {view3D ? (
                <FloorPlan3DViewer
                  floorPlan={floorPlan}
                  zones={zones}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <Info className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">2D viewer coming soon</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setView3D(true)}
                    >
                      Switch to 3D View
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Zone Analysis</CardTitle>
              <CardDescription>Detected zones in the floor plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(zonesByType).map(([type, zones]) => (
                  <div key={type}>
                    <h4 className="font-medium mb-2 capitalize">{type} Zones</h4>
                    <div className="space-y-1">
                      {zones.map((zone, index) => (
                        <div key={zone.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{type} {index + 1}</span>
                          {zone.area && (
                            <span className="font-medium">{zone.area.toFixed(1)}m²</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>File Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{floorPlan.fileType.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size:</span>
                  <span className="font-medium">{(floorPlan.fileSize / 1024).toFixed(1)} KB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scale:</span>
                  <span className="font-medium">1:{floorPlan.scale}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uploaded:</span>
                  <span className="font-medium">
                    {new Date(floorPlan.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}