import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useTheme } from '@/components/theme-provider';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Moon, Sun, Monitor, Save, Download, Trash2 } from 'lucide-react';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState({
    defaultCorridorWidth: 1.5,
    defaultScale: 1.0,
    autoSave: true,
    gridSize: 5,
    maxFileSize: 50,
    exportQuality: 'high'
  });

  const handleSavePreferences = () => {
    localStorage.setItem('app-preferences', JSON.stringify(preferences));
    toast({
      title: 'Settings saved',
      description: 'Your preferences have been saved successfully.',
      variant: 'success',
    });
  };

  const handleExportData = () => {
    // Export user data and projects
    toast({
      title: 'Export started',
      description: 'Your data export will begin shortly.',
      variant: 'default',
    });
  };

  const handleClearCache = () => {
    localStorage.clear();
    toast({
      title: 'Cache cleared',
      description: 'Application cache has been cleared.',
      variant: 'success',
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-8">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="max-w-4xl space-y-6">
        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the visual appearance of the application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Theme</label>
                <div className="flex gap-2 mt-2">
                  <Button
                    variant={theme === 'light' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('light')}
                    className="gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('dark')}
                    className="gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === 'system' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTheme('system')}
                    className="gap-2"
                  >
                    <Monitor className="h-4 w-4" />
                    System
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Default Values */}
        <Card>
          <CardHeader>
            <CardTitle>Default Values</CardTitle>
            <CardDescription>
              Set default values for new floor plans and configurations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Default Corridor Width (m)</label>
                <Input
                  type="number"
                  min="0.5"
                  max="5"
                  step="0.1"
                  value={preferences.defaultCorridorWidth}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    defaultCorridorWidth: parseFloat(e.target.value) || 1.5
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Default Scale</label>
                <Input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={preferences.defaultScale}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    defaultScale: parseFloat(e.target.value) || 1.0
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Grid Size (m)</label>
                <Input
                  type="number"
                  min="1"
                  max="20"
                  value={preferences.gridSize}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    gridSize: parseInt(e.target.value) || 5
                  }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Max File Size (MB)</label>
                <Input
                  type="number"
                  min="10"
                  max="200"
                  value={preferences.maxFileSize}
                  onChange={(e) => setPreferences(prev => ({
                    ...prev,
                    maxFileSize: parseInt(e.target.value) || 50
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export & Data */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Export your data or clear application cache
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleExportData} className="gap-2">
                <Download className="h-4 w-4" />
                Export Data
              </Button>
              <Button variant="outline" onClick={handleClearCache} className="gap-2">
                <Trash2 className="h-4 w-4" />
                Clear Cache
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Version:</span>
                <span className="ml-2">1.0.0</span>
              </div>
              <div>
                <span className="text-muted-foreground">Build:</span>
                <span className="ml-2">2025.1.6</span>
              </div>
              <div>
                <span className="text-muted-foreground">License:</span>
                <span className="ml-2">MIT</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSavePreferences} className="gap-2">
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}