import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { ArrowLeft, Play, Download, Eye, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { FloorPlan3DViewer } from '@/components/floor-plan-3d-viewer';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { FloorPlan, Zone, IlotConfiguration, GeneratedLayout } from '@shared/schema';

export function LayoutGeneratorPage() {
  const { floorPlanId } = useParams();
  const id = parseInt(floorPlanId!);
  const { toast } = useToast();
  const [selectedConfigId, setSelectedConfigId] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);

  const { data: floorPlan } = useQuery<FloorPlan>({
    queryKey: ['/api/floor-plans', id],
    enabled: !!id,
  });

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: [`/api/floor-plans/${id}/zones`],
    enabled: !!id,
  });

  const { data: configurations = [] } = useQuery<IlotConfiguration[]>({
    queryKey: [`/api/projects/${floorPlan?.projectId}/configurations`],
    enabled: !!floorPlan?.projectId,
  });

  const { data: layouts = [] } = useQuery<GeneratedLayout[]>({
    queryKey: [`/api/floor-plans/${id}/layouts`],
    enabled: !!id,
  });

  const generateLayoutMutation = useMutation({
    mutationFn: (configurationId: number) =>
      apiRequest(`/api/floor-plans/${id}/generate-layout`, 'POST', { configurationId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/floor-plans/${id}/layouts`] });
      toast({
        title: 'Success',
        description: 'Layout generated successfully',
      });
      setIsGenerating(false);
      setGenerationProgress(0);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to generate layout',
        variant: 'destructive',
      });
      setIsGenerating(false);
      setGenerationProgress(0);
    },
  });

  const handleGenerateLayout = () => {
    if (!selectedConfigId) {
      toast({
        title: 'Select Configuration',
        description: 'Please select an ilot configuration first',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(10);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setGenerationProgress(prev => Math.min(prev + 5, 90));
    }, 500);

    generateLayoutMutation.mutate(selectedConfigId, {
      onSettled: () => {
        clearInterval(progressInterval);
        setGenerationProgress(100);
        setTimeout(() => {
          setIsGenerating(false);
          setGenerationProgress(0);
        }, 500);
      },
    });
  };

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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Link href={`/floor-plans/${id}`}>
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Floor Plan
          </Button>
        </Link>
        <h1 className="text-3xl font-bold mb-2">Layout Generator</h1>
        <p className="text-muted-foreground">Generate optimized room layouts for {floorPlan.name}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {layouts.length > 0 ? (
            <Card className="h-[600px]">
              <CardHeader>
                <CardTitle>Latest Generated Layout</CardTitle>
                <CardDescription>
                  {layouts[0].totalIlots} rooms • {layouts[0].utilizationPercentage.toFixed(1)}% utilization
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 h-[500px]">
                <FloorPlan3DViewer
                  floorPlan={floorPlan}
                  zones={zones}
                  layout={layouts[0]}
                  className="w-full h-full"
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="h-[600px] flex items-center justify-center">
              <CardContent className="text-center">
                <Settings2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No layouts generated yet</h3>
                <p className="text-muted-foreground mb-4">
                  Select a configuration and generate your first optimized layout
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Select ilot size distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedConfigId?.toString()}
                onValueChange={(value) => setSelectedConfigId(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select configuration" />
                </SelectTrigger>
                <SelectContent>
                  {configurations.map((config) => (
                    <SelectItem key={config.id} value={config.id.toString()}>
                      {config.name}
                      {config.isDefault && ' (Default)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedConfigId && (
                <div className="mt-4 space-y-2 text-sm">
                  {(() => {
                    const config = configurations.find(c => c.id === selectedConfigId);
                    if (!config) return null;
                    const distribution = config.sizeDistribution as any[];
                    return distribution.map((dist, index) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {dist.minSize}-{dist.maxSize}m²:
                        </span>
                        <span className="font-medium">{dist.percentage}%</span>
                      </div>
                    ));
                  })()}
                </div>
              )}

              <Button
                className="w-full mt-4"
                onClick={handleGenerateLayout}
                disabled={!selectedConfigId || isGenerating}
              >
                {isGenerating ? (
                  <>Generating...</>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Generate Layout
                  </>
                )}
              </Button>

              {isGenerating && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Optimizing layout...</span>
                    <span>{generationProgress}%</span>
                  </div>
                  <Progress value={generationProgress} />
                </div>
              )}
            </CardContent>
          </Card>

          {layouts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
                <CardDescription>Latest layout performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Rooms:</span>
                    <span className="font-medium">{layouts[0].totalIlots}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Area:</span>
                    <span className="font-medium">{layouts[0].totalArea.toFixed(1)}m²</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Utilization:</span>
                    <span className="font-medium">{layouts[0].utilizationPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Algorithm:</span>
                    <span className="font-medium">{layouts[0].algorithm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Generation Time:</span>
                    <span className="font-medium">{layouts[0].generationTime.toFixed(2)}s</span>
                  </div>
                  {layouts[0].optimizationScore && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">ML Score:</span>
                      <span className="font-medium">{(layouts[0].optimizationScore * 100).toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Export Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" disabled={layouts.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export as PDF
              </Button>
              <Button variant="outline" className="w-full" disabled={layouts.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export as DXF
              </Button>
              <Button variant="outline" className="w-full" disabled={layouts.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Export as JSON
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}