import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FloorPlanViewer } from '@/components/floor-plan-viewer';
import { ArrowLeft, LayoutGrid, Download, Settings } from 'lucide-react';
import type { FloorPlan, Zone } from '@shared/schema';

export function FloorPlanPage() {
  const { id } = useParams();
  const floorPlanId = parseInt(id || '0');

  const { data: floorPlan, isLoading: floorPlanLoading } = useQuery<FloorPlan>({
    queryKey: [`/api/floor-plans/${floorPlanId}`],
  });

  const { data: zones = [], isLoading: zonesLoading } = useQuery<Zone[]>({
    queryKey: [`/api/floor-plans/${floorPlanId}/zones`],
  });

  if (floorPlanLoading || zonesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (!floorPlan) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Floor plan not found</h1>
          <p className="text-muted-foreground mt-2">The floor plan you're looking for doesn't exist.</p>
          <Link href="/projects">
            <Button className="mt-4">Back to Projects</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center space-x-4">
            <Link href={`/projects/${floorPlan.projectId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">{floorPlan.name}</h1>
              <p className="text-sm text-muted-foreground">
                {floorPlan.width.toFixed(1)} × {floorPlan.height.toFixed(1)} • Scale {floorPlan.scale}:1
              </p>
            </div>
          </div>
          
          <div className="ml-auto flex items-center space-x-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Link href={`/layout-generator/${floorPlanId}`}>
              <Button size="sm" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Generate Layout
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-80 border-r bg-background p-4 overflow-y-auto">
          <Card>
            <CardHeader>
              <CardTitle>Floor Plan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">File Type:</span>
                  <div className="font-medium">{floorPlan.fileType}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">File Size:</span>
                  <div className="font-medium">{(floorPlan.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Width:</span>
                  <div className="font-medium">{floorPlan.width.toFixed(2)} m</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Height:</span>
                  <div className="font-medium">{floorPlan.height.toFixed(2)} m</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Scale:</span>
                  <div className="font-medium">{floorPlan.scale}:1</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className={`font-medium ${floorPlan.processed ? 'text-green-600' : 'text-yellow-600'}`}>
                    {floorPlan.processed ? 'Processed' : 'Processing'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Detected Zones</CardTitle>
              <CardDescription>
                {zones.length} zone{zones.length !== 1 ? 's' : ''} detected
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {zones.map((zone) => (
                  <div key={zone.id} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: zone.color }}
                      />
                      <span className="text-sm font-medium capitalize">{zone.type}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {zone.area ? `${zone.area.toFixed(1)} m²` : '—'}
                    </div>
                  </div>
                ))}
                
                {zones.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground">
                    No zones detected yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Floor Plan Viewer */}
        <div className="flex-1">
          <FloorPlanViewer
            floorPlan={floorPlan}
            zones={zones}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
}