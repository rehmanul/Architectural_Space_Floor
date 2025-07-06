import { useState } from 'react';
import { Moon, Sun, Monitor, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme } from '@/components/theme-provider';
import { useToast } from '@/hooks/use-toast';

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    autoSave: true,
    showGrid: true,
    snapToGrid: true,
    highQualityRendering: true,
    realTimeSync: true,
  });

  const handleSettingChange = (key: string, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    toast({
      title: 'Setting updated',
      description: `${key.replace(/([A-Z])/g, ' $1').trim()} has been ${value ? 'enabled' : 'disabled'}`,
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Customize your workspace and preferences
        </p>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize the look and feel</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-3 block">Theme</Label>
                <RadioGroup value={theme} onValueChange={setTheme}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="flex items-center cursor-pointer">
                      <Sun className="w-4 h-4 mr-2" />
                      Light
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark" className="flex items-center cursor-pointer">
                      <Moon className="w-4 h-4 mr-2" />
                      Dark
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mt-2">
                    <RadioGroupItem value="system" id="system" />
                    <Label htmlFor="system" className="flex items-center cursor-pointer">
                      <Monitor className="w-4 h-4 mr-2" />
                      System
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Editor Preferences</CardTitle>
            <CardDescription>Configure floor plan editor behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-save" className="text-sm font-medium">
                  Auto-save
                </Label>
                <p className="text-sm text-muted-foreground">
                  Automatically save changes while editing
                </p>
              </div>
              <Switch
                id="auto-save"
                checked={settings.autoSave}
                onCheckedChange={(checked) => handleSettingChange('autoSave', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-grid" className="text-sm font-medium">
                  Show grid
                </Label>
                <p className="text-sm text-muted-foreground">
                  Display grid lines in the editor
                </p>
              </div>
              <Switch
                id="show-grid"
                checked={settings.showGrid}
                onCheckedChange={(checked) => handleSettingChange('showGrid', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="snap-to-grid" className="text-sm font-medium">
                  Snap to grid
                </Label>
                <p className="text-sm text-muted-foreground">
                  Align elements to grid when moving
                </p>
              </div>
              <Switch
                id="snap-to-grid"
                checked={settings.snapToGrid}
                onCheckedChange={(checked) => handleSettingChange('snapToGrid', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance</CardTitle>
            <CardDescription>Optimize application performance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="high-quality" className="text-sm font-medium">
                  High quality rendering
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable anti-aliasing and shadows in 3D view
                </p>
              </div>
              <Switch
                id="high-quality"
                checked={settings.highQualityRendering}
                onCheckedChange={(checked) => handleSettingChange('highQualityRendering', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="real-time-sync" className="text-sm font-medium">
                  Real-time sync
                </Label>
                <p className="text-sm text-muted-foreground">
                  Sync changes immediately in collaboration mode
                </p>
              </div>
              <Switch
                id="real-time-sync"
                checked={settings.realTimeSync}
                onCheckedChange={(checked) => handleSettingChange('realTimeSync', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Version:</span>
                <span className="font-medium">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">License:</span>
                <span className="font-medium">MIT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Built with:</span>
                <span className="font-medium">React, TypeScript, Three.js</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}