import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { Plus, FolderOpen, Edit, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertProjectSchema, type Project, type InsertProject } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';

export function ProjectsPage() {
  const [_, setLocation] = useLocation();
  const location = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(location.includes('new=true'));
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const { toast } = useToast();

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });

  const createProjectMutation = useMutation({
    mutationFn: (data: InsertProject) => apiRequest('/api/projects', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setIsCreateDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Project created successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to create project',
        variant: 'destructive',
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertProject> }) =>
      apiRequest(`/api/projects/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      setEditingProject(null);
      toast({
        title: 'Success',
        description: 'Project updated successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update project',
        variant: 'destructive',
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/projects/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      toast({
        title: 'Success',
        description: 'Project deleted successfully',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete project',
        variant: 'destructive',
      });
    },
  });

  const form = useForm<InsertProject>({
    resolver: zodResolver(insertProjectSchema.extend({})),
    defaultValues: {
      name: '',
      description: '',
      metadata: {},
    },
  });

  const handleCreateProject = (data: InsertProject) => {
    createProjectMutation.mutate(data);
  };

  const handleUpdateProject = (data: InsertProject) => {
    if (!editingProject) return;
    updateProjectMutation.mutate({ id: editingProject.id, data });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Projects</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="text-center p-12">
          <CardContent>
            <FolderOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-4">
              Create your first project to start optimizing hotel layouts
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create First Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span className="truncate">{project.name}</span>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setEditingProject(project);
                        form.reset({
                          name: project.name,
                          description: project.description || '',
                          metadata: project.metadata || {},
                        });
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this project?')) {
                          deleteProjectMutation.mutate(project.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardTitle>
                <CardDescription>{project.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                  <Link href={`/projects/${project.id}`}>
                    <Button size="sm">Open</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Project Dialog */}
      <Dialog open={isCreateDialogOpen || !!editingProject} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingProject(null);
          form.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProject ? 'Edit Project' : 'Create New Project'}</DialogTitle>
            <DialogDescription>
              {editingProject ? 'Update your project details' : 'Enter details for your new hotel layout project'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(editingProject ? handleUpdateProject : handleCreateProject)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Grand Hotel Renovation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your project..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingProject(null);
                  form.reset();
                }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createProjectMutation.isPending || updateProjectMutation.isPending}>
                  {editingProject ? 'Update' : 'Create'} Project
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}