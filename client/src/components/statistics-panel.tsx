
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, Zap, Target } from 'lucide-react';
import type { GeneratedLayout, Zone } from '@shared/schema';

interface StatisticsPanelProps {
  layout: GeneratedLayout;
  zones: Zone[];
  floorPlanArea: number;
}

export function StatisticsPanel({ layout, zones, floorPlanArea }: StatisticsPanelProps) {
  const ilots = layout.ilots || [];
  const corridors = layout.corridors || [];

  const calculateZoneStatistics = () => {
    const zoneTypes = zones.reduce((acc, zone) => {
      acc[zone.type] = (acc[zone.type] || 0) + (zone.area || 0);
      return acc;
    }, {} as Record<string, number>);

    return zoneTypes;
  };

  const calculateIlotDistribution = () => {
    const sizeRanges = [
      { label: 'Small (< 20m²)', min: 0, max: 20 },
      { label: 'Medium (20-40m²)', min: 20, max: 40 },
      { label: 'Large (40-60m²)', min: 40, max: 60 },
      { label: 'Extra Large (> 60m²)', min: 60, max: Infinity }
    ];

    return sizeRanges.map(range => {
      const count = ilots.filter(ilot => 
        ilot.area! >= range.min && ilot.area! < range.max
      ).length;
      
      return {
        ...range,
        count,
        percentage: ilots.length > 0 ? (count / ilots.length) * 100 : 0
      };
    });
  };

  const calculateEfficiencyMetrics = () => {
    const totalIlotArea = ilots.reduce((sum, ilot) => sum + (ilot.area || 0), 0);
    const totalCorridorArea = corridors.reduce((sum, corridor) => 
      sum + (corridor.width * corridor.height), 0
    );
    
    const accessibleIlots = ilots.filter(ilot => 
      corridors.some(corridor => corridor.connectedIlots?.includes(ilot.id))
    ).length;

    return {
      spaceUtilization: (totalIlotArea / floorPlanArea) * 100,
      corridorRatio: (totalCorridorArea / floorPlanArea) * 100,
      accessibility: ilots.length > 0 ? (accessibleIlots / ilots.length) * 100 : 0,
      averageIlotSize: ilots.length > 0 ? totalIlotArea / ilots.length : 0
    };
  };

  const zoneStats = calculateZoneStatistics();
  const ilotDistribution = calculateIlotDistribution();
  const efficiencyMetrics = calculateEfficiencyMetrics();

  const getPerformanceScore = () => {
    const scores = [
      layout.utilizationPercentage,
      efficiencyMetrics.accessibility,
      Math.max(0, 100 - efficiencyMetrics.corridorRatio * 2), // Lower corridor ratio is better
      layout.optimizationScore ? layout.optimizationScore * 100 : 75
    ];
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  };

  const performanceScore = getPerformanceScore();

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Performance Overview
          </CardTitle>
          <CardDescription>
            Overall layout optimization metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Score</span>
                <span className="font-medium">{performanceScore.toFixed(1)}%</span>
              </div>
              <Progress value={performanceScore} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Generation Time</div>
                <div className="font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {layout.generationTime.toFixed(2)}s
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Algorithm</div>
                <div className="font-medium">
                  <Badge variant="secondary" className="text-xs">
                    {layout.algorithm}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Space Utilization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Space Utilization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Room Area Coverage</span>
              <span className="font-medium">{layout.utilizationPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={layout.utilizationPercentage} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Corridor Area Ratio</span>
              <span className="font-medium">{efficiencyMetrics.corridorRatio.toFixed(1)}%</span>
            </div>
            <Progress value={efficiencyMetrics.corridorRatio} className="h-2" />
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Room Accessibility</span>
              <span className="font-medium">{efficiencyMetrics.accessibility.toFixed(1)}%</span>
            </div>
            <Progress value={efficiencyMetrics.accessibility} className="h-2" />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t text-sm">
            <div>
              <div className="text-muted-foreground">Total Rooms</div>
              <div className="font-medium">{layout.totalIlots}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg Room Size</div>
              <div className="font-medium">{efficiencyMetrics.averageIlotSize.toFixed(1)}m²</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room Size Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Room Size Distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ilotDistribution.map((dist, index) => (
            <div key={index}>
              <div className="flex justify-between text-sm mb-1">
                <span>{dist.label}</span>
                <span className="font-medium">{dist.count} rooms ({dist.percentage.toFixed(1)}%)</span>
              </div>
              <Progress value={dist.percentage} className="h-1.5" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Zone Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Zone Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(zoneStats).map(([type, area]) => (
            <div key={type} className="flex justify-between text-sm">
              <span className="capitalize">{type} Areas</span>
              <span className="font-medium">{area.toFixed(1)}m²</span>
            </div>
          ))}
          
          {Object.keys(zoneStats).length === 0 && (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No zones defined yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Optimization Score */}
      {layout.optimizationScore && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              AI Optimization Score
            </CardTitle>
            <CardDescription>
              Machine learning evaluation of layout quality
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>ML Score</span>
                <span className="font-medium">{(layout.optimizationScore * 100).toFixed(1)}%</span>
              </div>
              <Progress value={layout.optimizationScore * 100} className="h-2" />
              <div className="text-xs text-muted-foreground">
                Based on space utilization, accessibility, energy efficiency, and aesthetic arrangement
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
