import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ColorPicker } from '@/components/ui/color-picker';
import { Tooltip } from '@/components/ui/tooltip';
import { Save, Download, Upload, Palette, Settings as SettingsIcon, Users, Eye } from 'lucide-react';

export function SettingsPage() {
  const [primaryColor, setPrimaryColor] = useState('#3b82f6');
  const [secondaryColor, setSecondaryColor] = useState('#6b7280');
  const [exportQuality, setExportQuality] = useState('high');
  const [autoSave, setAutoSave] = useState(true);
  const [collaborationRole, setCollaborationRole] = useState('editor');

  const handleSaveSettings = () => {
    const settings = {
      primaryColor,
      secondaryColor,
      exportQuality,
      autoSave,
      collaborationRole
    };
    localStorage.setItem('app-settings', JSON.stringify(settings));
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-8 h-8" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="collaboration">Collaboration</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                General Settings
              </CardTitle>
              <CardDescription>Configure your application preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Default Project Name</label>
                <Input placeholder="My Hotel Project" />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Auto-save Interval</label>
                <select className="w-full p-2 border rounded">
                  <option value="30">30 seconds</option>
                  <option value="60">1 minute</option>
                  <option value="300">5 minutes</option>
                  <option value="0">Disabled</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="autoSave"
                  checked={autoSave}
                  onChange={(e) => setAutoSave(e.target.checked)}
                />
                <label htmlFor="autoSave" className="text-sm font-medium">
                  Enable auto-save
                </label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Appearance & Themes
              </CardTitle>
              <CardDescription>Customize the visual appearance of the application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-3">Primary Color</label>
                <ColorPicker value={primaryColor} onChange={setPrimaryColor} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-3">Secondary Color</label>
                <ColorPicker value={secondaryColor} onChange={setSecondaryColor} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">UI Scale</label>
                <select className="w-full p-2 border rounded">
                  <option value="small">Small (90%)</option>
                  <option value="normal">Normal (100%)</option>
                  <option value="large">Large (110%)</option>
                  <option value="xl">Extra Large (125%)</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="collaboration">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Collaboration Settings
              </CardTitle>
              <CardDescription>Configure real-time collaboration preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Default Role</label>
                <select 
                  className="w-full p-2 border rounded"
                  value={collaborationRole}
                  onChange={(e) => setCollaborationRole(e.target.value)}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="host">Host</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="showCursors" defaultChecked />
                  <label htmlFor="showCursors" className="text-sm font-medium">
                    Show participant cursors
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="soundNotifications" defaultChecked />
                  <label htmlFor="soundNotifications" className="text-sm font-medium">
                    Sound notifications
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="autoJoinSessions" />
                  <label htmlFor="autoJoinSessions" className="text-sm font-medium">
                    Auto-join collaboration sessions
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="export">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="w-5 h-5" />
                Export Settings
              </CardTitle>
              <CardDescription>Configure export and output preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Default Export Quality</label>
                <select 
                  className="w-full p-2 border rounded"
                  value={exportQuality}
                  onChange={(e) => setExportQuality(e.target.value)}
                >
                  <option value="high">High (300 DPI)</option>
                  <option value="medium">Medium (150 DPI)</option>
                  <option value="low">Low (72 DPI)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Default Export Format</label>
                <select className="w-full p-2 border rounded">
                  <option value="pdf">PDF</option>
                  <option value="png">PNG</option>
                  <option value="jpg">JPEG</option>
                  <option value="json">JSON Data</option>
                </select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="includeMetadata" defaultChecked />
                  <label htmlFor="includeMetadata" className="text-sm font-medium">
                    Include metadata in exports
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <input type="checkbox" id="watermark" />
                  <label htmlFor="watermark" className="text-sm font-medium">
                    Add watermark to exports
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4 mt-8">
        <Button variant="outline">
          Reset to Defaults
        </Button>
        <Tooltip content="Save all settings changes">
          <Button onClick={handleSaveSettings} className="flex items-center gap-2">
            <Save className="w-4 h-4" />
            Save Settings
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}