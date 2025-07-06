
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Image, Code, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { GeneratedLayout } from '@shared/schema';

interface ExportDialogProps {
  layout: GeneratedLayout;
  floorPlanId: number;
  onClose: () => void;
}

export function ExportDialog({ layout, floorPlanId, onClose }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png' | 'dxf' | 'json'>('pdf');
  const [exportOptions, setExportOptions] = useState({
    includeStatistics: true,
    includeZones: true,
    includeCorridors: true,
    resolution: 'high'
  });
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await apiRequest(`/api/floor-plans/${floorPlanId}/layouts/${layout.id}/export`, 'POST', {
        format: exportFormat,
        options: exportOptions
      });

      // Create download link
      const blob = new Blob([response], { 
        type: getContentType(exportFormat) 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `layout-${layout.id}.${exportFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Layout exported as ${exportFormat.toUpperCase()}`,
      });

      onClose();
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: 'Failed to export layout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getContentType = (format: string): string => {
    switch (format) {
      case 'pdf': return 'application/pdf';
      case 'png': return 'image/png';
      case 'dxf': return 'application/dxf';
      case 'json': return 'application/json';
      default: return 'application/octet-stream';
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'pdf': return <FileText className="w-4 h-4" />;
      case 'png': return <Image className="w-4 h-4" />;
      case 'dxf': return <Code className="w-4 h-4" />;
      case 'json': return <Code className="w-4 h-4" />;
      default: return <Download className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Export Layout</CardTitle>
            <CardDescription>
              Choose format and options for exporting your layout
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Export Format</label>
            <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    PDF Document
                  </div>
                </SelectItem>
                <SelectItem value="png">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    PNG Image
                  </div>
                </SelectItem>
                <SelectItem value="dxf">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    DXF CAD File
                  </div>
                </SelectItem>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    JSON Data
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium">Export Options</label>
            
            <div className="space-y-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={exportOptions.includeStatistics}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    includeStatistics: e.target.checked
                  })}
                  className="rounded"
                />
                <span>Include statistics and metrics</span>
              </label>

              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={exportOptions.includeZones}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    includeZones: e.target.checked
                  })}
                  className="rounded"
                />
                <span>Include zone boundaries</span>
              </label>

              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={exportOptions.includeCorridors}
                  onChange={(e) => setExportOptions({
                    ...exportOptions,
                    includeCorridors: e.target.checked
                  })}
                  className="rounded"
                />
                <span>Include corridor markings</span>
              </label>
            </div>

            {(exportFormat === 'png' || exportFormat === 'pdf') && (
              <div>
                <label className="text-sm font-medium mb-2 block">Resolution</label>
                <Select 
                  value={exportOptions.resolution} 
                  onValueChange={(value) => setExportOptions({
                    ...exportOptions,
                    resolution: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low (72 DPI)</SelectItem>
                    <SelectItem value="medium">Medium (150 DPI)</SelectItem>
                    <SelectItem value="high">High (300 DPI)</SelectItem>
                    <SelectItem value="ultra">Ultra (600 DPI)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Layout Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Total Rooms:</div>
              <div>{layout.totalIlots}</div>
              <div className="text-muted-foreground">Total Area:</div>
              <div>{layout.totalArea.toFixed(1)}m²</div>
              <div className="text-muted-foreground">Utilization:</div>
              <div>{layout.utilizationPercentage.toFixed(1)}%</div>
              <div className="text-muted-foreground">Algorithm:</div>
              <div>{layout.algorithm}</div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={isExporting} className="flex-1">
              {isExporting ? (
                'Exporting...'
              ) : (
                <>
                  {getFormatIcon(exportFormat)}
                  Export {exportFormat.toUpperCase()}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
