import { Link } from 'wouter';
import { Building2, PlusCircle, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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