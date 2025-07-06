import { Link } from 'wouter';
import { Building2, PlusCircle, Users, Settings, Zap, Brain, Eye, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip } from '@/components/ui/tooltip';

export function HomePage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Architectural Space Analyzer
        </h1>
        <p className="text-lg text-muted-foreground">
          AI-powered hotel layout optimization for maximum space utilization
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Projects
            </CardTitle>
            <CardDescription>
              Manage your hotel floor plan projects
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/projects">
              <Button className="w-full">
                View Projects
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5" />
              Upload Floor Plans
            </CardTitle>
            <CardDescription>
              Upload DXF, CAD files, or architectural drawings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tooltip content="Supports DXF, DWG, PNG, JPG, and PDF formats">
              <Button className="w-full" variant="outline">
                Upload Files
              </Button>
            </Tooltip>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Collaboration
            </CardTitle>
            <CardDescription>
              Real-time team collaboration tools
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/collaboration">
              <Button className="w-full" variant="outline">
                Start Session
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">Key Features</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="text-center p-6">
            <Brain className="w-8 h-8 mx-auto mb-3 text-blue-600" />
            <h3 className="font-semibold mb-2">AI Optimization</h3>
            <p className="text-sm text-muted-foreground">
              Machine learning powered layout optimization for maximum space utilization
            </p>
          </Card>

          <Card className="text-center p-6">
            <Eye className="w-8 h-8 mx-auto mb-3 text-green-600" />
            <h3 className="font-semibold mb-2">3D Visualization</h3>
            <p className="text-sm text-muted-foreground">
              Advanced WebGL rendering with interactive 3D navigation
            </p>
          </Card>

          <Card className="text-center p-6">
            <Zap className="w-8 h-8 mx-auto mb-3 text-purple-600" />
            <h3 className="font-semibold mb-2">Real-time Updates</h3>
            <p className="text-sm text-muted-foreground">
              Live collaboration with instant layout updates across all participants
            </p>
          </Card>

          <Card className="text-center p-6">
            <Settings className="w-8 h-8 mx-auto mb-3 text-orange-600" />
            <h3 className="font-semibold mb-2">Smart Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Comprehensive space utilization metrics and performance analytics
            </p>
          </Card>
        </div>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="w-5 h-5" />
              New Project
            </CardTitle>
            <CardDescription>
              Start a new hotel layout optimization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/projects?new=true">
              <Button className="w-full" variant="outline">
                Create Project
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Collaboration
            </CardTitle>
            <CardDescription>
              Work together on floor plans in real-time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/projects">
              <Button className="w-full" variant="outline">
                Join Session
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 bg-muted/50 rounded-lg p-6">
        <h2 className="text-2xl font-semibold mb-4">Features</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-medium mb-2">✓ DXF File Support</h3>
            <p className="text-sm text-muted-foreground">
              Import AutoCAD DXF files directly for accurate floor plan analysis
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">✓ AI-Powered Optimization</h3>
            <p className="text-sm text-muted-foreground">
              Machine learning algorithms for optimal room placement
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">✓ 3D Visualization</h3>
            <p className="text-sm text-muted-foreground">
              Interactive 3D views of your optimized layouts
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-2">✓ Real-time Collaboration</h3>
            <p className="text-sm text-muted-foreground">
              Work with your team simultaneously on the same project
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}