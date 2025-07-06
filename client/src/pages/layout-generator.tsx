import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { FloorPlanViewer } from '@/components/floor-plan-viewer';
import { LayoutRenderer } from '@/components/layout-renderer';
import { IlotConfigurationForm } from '@/components/ilot-configuration-form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ArrowLeft, Play, Save, Download, Settings } from 'lucide-react';
import type { FloorPlan, Zone, IlotConfiguration, GeneratedLayout } from '@shared/schema';

export function LayoutGeneratorPage() {
  const { floorPlanId } = useParams();
  const [selectedConfiguration, setSelectedConfiguration] = useState<IlotConfiguration | null>(null);
  const [generatedLayout, setGeneratedLayout] = useState<GeneratedLayout | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [layoutName, setLayoutName] = useState('');
  const { toast } = useToast();

  const { data: floorPlan } = useQuery<FloorPlan>({
    queryKey: [`/api/floor-plans/${floorPlanId}`],
  });

  const { data: zones = [] } = useQuery<Zone[]>({
    queryKey: [`/api/floor-plans/${floorPlanId}/zones`],
  });

  const { data: configurations = [] } = useQuery<IlotConfiguration[]>({
    queryKey: [`/api/projects/${floorPlan?.projectId}/configurations`],
    enabled: !!floorPlan?.projectId,
  });

  const { data: layouts = [] } = useQuery<GeneratedLayout[]>({
    queryKey: [`/api/floor-plans/${floorPlanId}/layouts`],
  });

  const generateLayoutMutation = useMutation({
    mutationFn: (data: { configurationId: number; name: string }) =>
      apiRequest(`/api/floor-plans/${floorPlanId}/generate-layout`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/floor-plans/${floorPlanId}/layouts`] });
      setGeneratedLayout(data.layout);
      setIsGenerating(false);
      toast({
        title: 'Layout generated successfully',
        description: `Optimization score: ${data.score.toFixed(1)} | Utilization: ${data.utilizationPercentage.toFixed(1)}%`,
        variant: 'success',
      });
    },
    onError: (error) => {
      setIsGenerating(false);
      toast({
        title: 'Generation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleGenerateLayout = () => {
    if (!selectedConfiguration) {
      toast({
        title: 'Configuration required',
        description: 'Please select or create a configuration first.',
        variant: 'destructive',
      });
      return;
    }

    const name = layoutName.trim() || `Layout ${Date.now()}`;
    setIsGenerating(true);
    generateLayoutMutation.mutate({
      configurationId: selectedConfiguration.id,
      name,
    });
  };

  if (!floorPlan) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Floor plan not found</h1>
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
            <Link href={`/floor-plans/${floorPlanId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">Layout Generator</h1>
              <p className="text-sm text-muted-foreground">{floorPlan.name}</p>
            </div>
          </div>
          
          <div className="ml-auto flex items-center space-x-2">
            <Input
              placeholder="Layout name"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              className="w-48"
            />
            <Button
              onClick={handleGenerateLayout}
              disabled={isGenerating || !selectedConfiguration}
              className="gap-2"
            >
              {isGenerating ? (
                <div className="loading-spinner" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <div className="w-96 border-r bg-background overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Configuration Section */}
            <Card>
              <CardHeader>
                <CardTitle>Room Configuration</CardTitle>
                <CardDescription>
                  Define room size distributions and corridor settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <IlotConfigurationForm
                  projectId={floorPlan.projectId}
                  selectedConfiguration={selectedConfiguration}
                  onConfigurationSelect={setSelectedConfiguration}
                />
              </CardContent>
            </Card>

            {/* Generated Layouts */}
            <Card>
              <CardHeader>
                <CardTitle>Generated Layouts</CardTitle>
                <CardDescription>
                  {layouts.length} layout{layouts.length !== 1 ? 's' : ''} generated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {layouts.map((layout) => (
                    <div
                      key={layout.id}
                      className={`p-3 rounded border cursor-pointer transition-colors ${
                        generatedLayout?.id === layout.id
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setGeneratedLayout(layout)}
                    >
                      <div className="font-medium">{layout.name}</div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Score: {layout.optimizationScore?.toFixed(1) || 'N/A'}</div>
                        <div>Utilization: {layout.utilizationPercentage.toFixed(1)}%</div>
                        <div>Rooms: {layout.totalIlots}</div>
                      </div>
                    </div>
                  ))}
                  
                  {layouts.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No layouts generated yet
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Main Viewer */}
        <div className="flex-1">
          {generatedLayout ? (
            <LayoutRenderer
              floorPlan={floorPlan}
              zones={zones}
              layout={generatedLayout}
              className="w-full h-full"
            />
          ) : (
            <FloorPlanViewer
              floorPlan={floorPlan}
              zones={zones}
              className="w-full h-full"
            />
          )}
        </div>
      </div>
    </div>
  );
}