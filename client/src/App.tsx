import { QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch } from 'wouter';
import { queryClient } from '@/lib/queryClient';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import { CollaborationProvider } from '@/components/collaboration-provider';
import { Layout } from '@/components/layout';

// Pages
import { HomePage } from '@/pages/home';
import { ProjectsPage } from '@/pages/projects';
import { ProjectDetailPage } from '@/pages/project-detail';
import { FloorPlanPage } from '@/pages/floor-plan';
import { LayoutGeneratorPage } from '@/pages/layout-generator';
import { CollaborationPage } from '@/pages/collaboration';
import { SettingsPage } from '@/pages/settings';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <CollaborationProvider>
          <Layout>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/projects" component={ProjectsPage} />
              <Route path="/projects/:id" component={ProjectDetailPage} />
              <Route path="/floor-plans/:id" component={FloorPlanPage} />
              <Route path="/layout-generator/:floorPlanId" component={LayoutGeneratorPage} />
              <Route path="/collaboration/:sessionId" component={CollaborationPage} />
              <Route path="/settings" component={SettingsPage} />
              
              {/* 404 fallback */}
              <Route>
                <div className="flex items-center justify-center min-h-screen">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-muted-foreground">404</h1>
                    <p className="text-lg text-muted-foreground mt-2">Page not found</p>
                    <a href="/" className="text-primary hover:underline mt-4 inline-block">
                      Go back home
                    </a>
                  </div>
                </div>
              </Route>
            </Switch>
          </Layout>
          <Toaster />
        </CollaborationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;