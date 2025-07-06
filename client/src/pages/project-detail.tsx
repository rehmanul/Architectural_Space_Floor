import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Plus, Upload, FileImage, Maximize2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Project, FloorPlan, IlotConfiguration, GeneratedLayout } from '@shared/schema';

export function ProjectDetailPage() {
  const { id } = useParams();
  const projectId = parseInt(id!);
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId,
  });

  const { data: floorPlans = [] } = useQuery<FloorPlan[]>({
    queryKey: [`/api/projects/${projectId}/floor-plans`],
    enabled: !!projectId,
  });

  const { data: configurations = [] } = useQuery<IlotConfiguration[]>({
    queryKey: [`/api/projects/${projectId}/configurations`],
    enabled: !!projectId,
  });

  const uploadFloorPlanMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', file.name);
      
      const response = await fetch(`/api/projects/${projectId}/floor-plans/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'x-user-id': 'default-user',
        },
      });
      
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/floor-plans`] });
      toast({
        title: 'Success',
        description: 'Floor plan uploaded successfully',
      });
      setIsUploading(false);
      setUploadProgress(0);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to upload floor plan',
        variant: 'destructive',
      });
      setIsUploading(false);
      setUploadProgress(0);
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['.dxf', '.png', '.jpg', '.jpeg'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a DXF, PNG, JPG, or JPEG file',
        variant: 'destructive',
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(30);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    uploadFloorPlanMutation.mutate(file, {
      onSettled: () => {
        clearInterval(progressInterval);
        setUploadProgress(100);
        setTimeout(() => {
          setIsUploading(false);
          setUploadProgress(0);
        }, 500);
      },
    });
  };

  if (projectLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">Project not found</h1>
        <Link href="/projects">
          <Button>Back to Projects</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <Link href="/projects">Projects</Link>
          <span>/</span>
          <span>{project.name}</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground">{project.description}</p>
        )}
      </div>

      <Tabs defaultValue="floor-plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="floor-plans">Floor Plans</TabsTrigger>
          <TabsTrigger value="configurations">Ilot Configurations</TabsTrigger>
          <TabsTrigger value="layouts">Generated Layouts</TabsTrigger>
        </TabsList>

        <TabsContent value="floor-plans" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Floor Plans</h2>
            <label htmlFor="file-upload">
              <input
                id="file-upload"
                type="file"
                accept=".dxf,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Floor Plan
                </span>
              </Button>
            </label>
          </div>

          {isUploading && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading floor plan...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              </CardContent>
            </Card>
          )}

          {floorPlans.length === 0 && !isUploading ? (
            <Card className="text-center p-12">
              <CardContent>
                <FileImage className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No floor plans yet</h3>
                <p className="text-muted-foreground mb-4">
                  Upload a DXF file or image to start analyzing your hotel layout
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {floorPlans.map((floorPlan) => (
                <Card key={floorPlan.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{floorPlan.name}</CardTitle>
                    <CardDescription>
                      {floorPlan.width.toFixed(1)} × {floorPlan.height.toFixed(1)} meters
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium">{floorPlan.fileType.toUpperCase()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Size:</span>
                        <span className="font-medium">{(floorPlan.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={`font-medium ${floorPlan.processed ? 'text-green-600' : 'text-yellow-600'}`}>
                          {floorPlan.processed ? 'Processed' : 'Processing...'}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Link href={`/floor-plans/${floorPlan.id}`}>
                        <Button size="sm" className="flex-1">
                          <Maximize2 className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </Link>
                      <Link href={`/layout-generator/${floorPlan.id}`}>
                        <Button size="sm" variant="outline" className="flex-1">
                          Generate Layout
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="configurations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Ilot Configurations</h2>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Configuration
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {configurations.map((config) => (
              <Card key={config.id}>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    {config.name}
                    {config.isDefault && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">Default</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Corridor Width:</span>
                      <span className="ml-2 font-medium">{config.corridorWidth}m</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Room Size Range:</span>
                      <span className="ml-2 font-medium">{config.minRoomSize} - {config.maxRoomSize}m²</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="layouts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Generated Layouts</h2>
            <Link href="/collaboration/new">
              <Button variant="outline">
                <Users className="w-4 h-4 mr-2" />
                Start Collaboration
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className="p-12 text-center">
              <h3 className="text-lg font-semibold mb-2">No layouts generated yet</h3>
              <p className="text-muted-foreground">
                Upload a floor plan and generate optimized layouts
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}