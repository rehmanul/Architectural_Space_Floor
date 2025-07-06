import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FolderOpen, Users, Zap, Brain, Eye } from 'lucide-react';

export function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Advanced Architectural Space Analyzer
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
          Optimize hotel layouts with AI-powered space analysis. Upload floor plans, define room distributions, 
          and generate optimal arrangements with real-time collaboration.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/projects">
            <Button size="lg" className="gap-2">
              <FolderOpen className="h-5 w-5" />
              View Projects
            </Button>
          </Link>
          <Button variant="outline" size="lg">
            Watch Demo
          </Button>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Smart File Processing
            </CardTitle>
            <CardDescription>
              Upload DXF files or images and automatically detect zones, walls, and restricted areas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• DXF and CAD file support</li>
              <li>• Image analysis with color detection</li>
              <li>• Automatic zone classification</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Optimization
            </CardTitle>
            <CardDescription>
              Machine learning algorithms optimize space utilization and room placement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Genetic algorithm optimization</li>
              <li>• ML-based scoring system</li>
              <li>• Constraint satisfaction</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              3D Visualization
            </CardTitle>
            <CardDescription>
              Advanced WebGL rendering with interactive 3D floor plan visualization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Real-time 3D rendering</li>
              <li>• Interactive navigation</li>
              <li>• Multiple view modes</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Real-time Collaboration
            </CardTitle>
            <CardDescription>
              Work together with your team in real-time with live cursors and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Live cursor tracking</li>
              <li>• Real-time edits</li>
              <li>• Team permissions</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Advanced Analytics
            </CardTitle>
            <CardDescription>
              Detailed space utilization metrics and optimization scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Utilization percentages</li>
              <li>• Optimization scoring</li>
              <li>• Performance metrics</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Export & Integration
            </CardTitle>
            <CardDescription>
              Export results to multiple formats and integrate with CAD systems
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• PDF and image export</li>
              <li>• CAD format support</li>
              <li>• API integration</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
          <CardDescription>
            Get started with your first floor plan analysis in minutes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-1">Create Project</h3>
              <p className="text-sm text-muted-foreground">Start a new project for your hotel layout</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-1">Upload Floor Plan</h3>
              <p className="text-sm text-muted-foreground">Upload your DXF file or floor plan image</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-1">Configure Rooms</h3>
              <p className="text-sm text-muted-foreground">Set room size distributions and preferences</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-primary font-bold">4</span>
              </div>
              <h3 className="font-semibold mb-1">Generate Layout</h3>
              <p className="text-sm text-muted-foreground">AI optimizes and generates your layout</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}