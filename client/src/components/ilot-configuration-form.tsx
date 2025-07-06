import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Plus, Trash2, Save } from 'lucide-react';
import type { IlotConfiguration } from '@shared/schema';

interface SizeDistribution {
  minSize: number;
  maxSize: number;
  percentage: number;
}

interface IlotConfigurationFormProps {
  projectId: number;
  selectedConfiguration: IlotConfiguration | null;
  onConfigurationSelect: (config: IlotConfiguration | null) => void;
}

export function IlotConfigurationForm({
  projectId,
  selectedConfiguration,
  onConfigurationSelect,
}: IlotConfigurationFormProps) {
  const [name, setName] = useState('');
  const [corridorWidth, setCorridorWidth] = useState(1.5);
  const [distributions, setDistributions] = useState<SizeDistribution[]>([
    { minSize: 0, maxSize: 1, percentage: 10 },
    { minSize: 1, maxSize: 3, percentage: 25 },
    { minSize: 3, maxSize: 5, percentage: 30 },
    { minSize: 5, maxSize: 10, percentage: 35 },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const { data: configurations = [] } = useQuery<IlotConfiguration[]>({
    queryKey: [`/api/projects/${projectId}/configurations`],
  });

  const createConfigurationMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest(`/api/projects/${projectId}/configurations`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (newConfig) => {
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}/configurations`] });
      onConfigurationSelect(newConfig);
      setIsCreating(false);
      setName('');
      toast({
        title: 'Configuration saved',
        description: 'Your room configuration has been created successfully.',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error saving configuration',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const addDistribution = () => {
    setDistributions([...distributions, { minSize: 0, maxSize: 1, percentage: 0 }]);
  };

  const removeDistribution = (index: number) => {
    setDistributions(distributions.filter((_, i) => i !== index));
  };

  const updateDistribution = (index: number, field: keyof SizeDistribution, value: number) => {
    const updated = [...distributions];
    updated[index] = { ...updated[index], [field]: value };
    setDistributions(updated);
  };

  const getTotalPercentage = () => {
    return distributions.reduce((sum, d) => sum + d.percentage, 0);
  };

  const handleSaveConfiguration = () => {
    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this configuration.',
        variant: 'destructive',
      });
      return;
    }

    const totalPercentage = getTotalPercentage();
    if (Math.abs(totalPercentage - 100) > 0.1) {
      toast({
        title: 'Invalid percentages',
        description: `Percentages must sum to 100% (currently ${totalPercentage.toFixed(1)}%)`,
        variant: 'destructive',
      });
      return;
    }

    createConfigurationMutation.mutate({
      name: name.trim(),
      sizeDistribution: distributions,
      corridorWidth,
      minRoomSize: Math.min(...distributions.map(d => d.minSize)),
      maxRoomSize: Math.max(...distributions.map(d => d.maxSize)),
      isDefault: configurations.length === 0,
    });
  };

  const loadConfiguration = (config: IlotConfiguration) => {
    onConfigurationSelect(config);
    setName(config.name);
    setCorridorWidth(config.corridorWidth);
    
    const sizeDistribution = config.sizeDistribution as SizeDistribution[];
    if (Array.isArray(sizeDistribution)) {
      setDistributions(sizeDistribution);
    }
  };

  return (
    <div className="space-y-4">
      {/* Existing Configurations */}
      {configurations.length > 0 && (
        <div>
          <h4 className="font-medium mb-2">Saved Configurations</h4>
          <div className="space-y-2">
            {configurations.map((config) => (
              <div
                key={config.id}
                className={`p-3 rounded border cursor-pointer transition-colors ${
                  selectedConfiguration?.id === config.id
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => loadConfiguration(config)}
              >
                <div className="font-medium">{config.name}</div>
                <div className="text-xs text-muted-foreground">
                  Corridor: {config.corridorWidth}m • {config.isDefault ? 'Default' : 'Custom'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create New Configuration */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-medium">New Configuration</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(!isCreating)}
          >
            {isCreating ? 'Cancel' : 'Create New'}
          </Button>
        </div>

        {(isCreating || configurations.length === 0) && (
          <div className="space-y-4 p-4 border rounded">
            <Input
              placeholder="Configuration name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <div>
              <label className="text-sm font-medium">Corridor Width (meters)</label>
              <Input
                type="number"
                min="0.5"
                max="5"
                step="0.1"
                value={corridorWidth}
                onChange={(e) => setCorridorWidth(parseFloat(e.target.value) || 1.5)}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Room Size Distribution</label>
                <Button variant="outline" size="sm" onClick={addDistribution}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-2">
                {distributions.map((dist, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      min="0"
                      step="0.1"
                      value={dist.minSize}
                      onChange={(e) =>
                        updateDistribution(index, 'minSize', parseFloat(e.target.value) || 0)
                      }
                      className="w-20"
                    />
                    <span className="text-muted-foreground">to</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      min="0"
                      step="0.1"
                      value={dist.maxSize}
                      onChange={(e) =>
                        updateDistribution(index, 'maxSize', parseFloat(e.target.value) || 0)
                      }
                      className="w-20"
                    />
                    <span className="text-muted-foreground">m²</span>
                    <Input
                      type="number"
                      placeholder="%"
                      min="0"
                      max="100"
                      step="1"
                      value={dist.percentage}
                      onChange={(e) =>
                        updateDistribution(index, 'percentage', parseFloat(e.target.value) || 0)
                      }
                      className="w-16"
                    />
                    <span className="text-muted-foreground">%</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeDistribution(index)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="text-sm text-muted-foreground">
                Total: {getTotalPercentage().toFixed(1)}%
                {Math.abs(getTotalPercentage() - 100) > 0.1 && (
                  <span className="text-destructive ml-2">
                    (Must equal 100%)
                  </span>
                )}
              </div>
            </div>

            <Button
              onClick={handleSaveConfiguration}
              disabled={createConfigurationMutation.isPending}
              className="w-full gap-2"
            >
              {createConfigurationMutation.isPending ? (
                <div className="loading-spinner" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Configuration
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}