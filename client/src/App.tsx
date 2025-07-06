import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch } from 'wouter';
import { Layout } from '@/components/layout';
import { HomePage } from '@/pages/home';
import { ProjectsPage } from '@/pages/projects';
import { ProjectDetailPage } from '@/pages/project-detail';
import { FloorPlanPage } from '@/pages/floor-plan';
import { LayoutGeneratorPage } from '@/pages/layout-generator';
import { CollaborationPage } from '@/pages/collaboration';
import { SettingsPage } from '@/pages/settings';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { CollaborationProvider } from '@/components/collaboration-provider';
import { Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="app-theme">
        <CollaborationProvider>
          <Layout>
            <Suspense fallback={<LoadingSpinner />}>
              <Switch>
                <Route path="/" component={HomePage} />
                <Route path="/projects" component={ProjectsPage} />
                <Route path="/projects/:id" component={ProjectDetailPage} />
                <Route path="/projects/:projectId/floor-plans/:id" component={FloorPlanPage} />
                <Route path="/projects/:projectId/generate-layout" component={LayoutGeneratorPage} />
                <Route path="/collaboration/:sessionId" component={CollaborationPage} />
                <Route path="/settings" component={SettingsPage} />
              </Switch>
            </Suspense>
          </Layout>
          <Toaster />
        </CollaborationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router, Route, Switch } from 'wouter';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Layout } from '@/components/layout';

// Pages
import { HomePage } from '@/pages/home';
import { ProjectsPage } from '@/pages/projects';
import { ProjectDetailPage } from '@/pages/project-detail';
import { FloorPlanPage } from '@/pages/floor-plan';
import { LayoutGeneratorPage } from '@/pages/layout-generator';
import { CollaborationPage } from '@/pages/collaboration';
import { CollaborationSessionPage } from '@/pages/collaboration-session';
import { SettingsPage } from '@/pages/settings';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="app-theme">
        <Router>
          <Layout>
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/projects" component={ProjectsPage} />
              <Route path="/projects/:id" component={ProjectDetailPage} />
              <Route path="/floor-plans/:id" component={FloorPlanPage} />
              <Route path="/floor-plans/:floorPlanId/generator" component={LayoutGeneratorPage} />
              <Route path="/collaboration" component={CollaborationPage} />
              <Route path="/collaboration/session/:sessionId" component={CollaborationSessionPage} />
              <Route path="/settings" component={SettingsPage} />
              
              {/* 404 Route */}
              <Route>
                <div className="container mx-auto p-6 text-center">
                  <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
                  <p className="text-muted-foreground mb-4">
                    The page you're looking for doesn't exist.
                  </p>
                  <a href="/" className="text-primary hover:underline">
                    Return to Home
                  </a>
                </div>
              </Route>
            </Switch>
          </Layout>
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
