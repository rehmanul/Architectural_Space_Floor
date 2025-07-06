import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { formatFileSize } from '@/lib/utils';
import { 
  Upload, 
  FileText, 
  Calendar, 
  Eye, 
  Settings, 
  Users,
  LayoutGrid,
  Download,
  Trash2
} from 'lucide-react';
import type { Project, FloorPlan } from '@shared/schema';

export function ProjectDetailPage() {
  const { id } = useParams();
  const projectId = parseInt(id || '0');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: project, isLoading: projectLoading } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  const { data: floorPlans = [], isLoading: floorPlansLoading } = useQuery<FloorPlan[]>({
    queryKey: [`/api/projects/${projectId}/floor-plans`],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch(`/api/projects/${projectId}/floor-plans`, {
        method: 'POST',
        headers: {
          'X-User-ID': 'current-user',
        },
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/floor-plans`] });
      setIsUploading(false);
      toast({
        title: 'Floor plan uploaded',
        description: 'Your floor plan has been processed successfully.',
        variant: 'success',
      });
    },
    onError: (error) => {
      setIsUploading(false);
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['.dxf', '.dwg', '.png', '.jpg', '.jpeg', '.pdf'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a DXF, DWG, PNG, JPG, or PDF file.',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      toast({
        title: 'File too large',
        description: 'Please upload a file smaller than 50MB.',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name.split('.')[0]);

    setIsUploading(true);
    uploadMutation.mutate(formData);
  };

  if (projectLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Project not found</h1>
          <p className="text-muted-foreground mt-2">The project you're looking for doesn't exist.</p>
          <Link href="/projects">
            <Button className="mt-4">Back to Projects</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Project Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
          {project.description && (
            <p className="text-muted-foreground mt-2">{project.description}</p>
          )}
          <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Created {new Date(project.createdAt).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <FileText className="h-4 w-4" />
              {floorPlans.length} floor plan{floorPlans.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Users className="h-4 w-4" />
            Collaborate
          </Button>
          <Button variant="outline" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Upload Floor Plan</CardTitle>
          <CardDescription>
            Upload DXF files, CAD drawings, or floor plan images for analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <input
            ref={fileInputRef}
            type="file"
            accept=".dxf,.dwg,.png,.jpg,.jpeg,.pdf"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div
            className="file-upload-area"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              {isUploading ? 'Processing...' : 'Drop files here or click to upload'}
            </p>
            <p className="text-sm text-muted-foreground">
              Supports DXF, DWG, PNG, JPG, and PDF files up to 50MB
            </p>
            {isUploading && (
              <div className="loading-spinner mx-auto mt-4" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Floor Plans Grid */}
      {floorPlansLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="loading-spinner" />
        </div>
      ) : floorPlans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No floor plans yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Upload your first floor plan to start the analysis
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {floorPlans.map((floorPlan) => (
            <Card key={floorPlan.id} className="group">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{floorPlan.name}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>
                  {floorPlan.fileType} • {formatFileSize(floorPlan.fileSize)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dimensions:</span>
                    <span>{floorPlan.width.toFixed(1)} × {floorPlan.height.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scale:</span>
                    <span>{floorPlan.scale}:1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={floorPlan.processed ? 'text-green-600' : 'text-yellow-600'}>
                      {floorPlan.processed ? 'Processed' : 'Processing'}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Link href={`/floor-plans/${floorPlan.id}`}>
                    <Button size="sm" className="gap-1">
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                  </Link>
                  {floorPlan.processed && (
                    <Link href={`/layout-generator/${floorPlan.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <LayoutGrid className="h-4 w-4" />
                        Generate
                      </Button>
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}