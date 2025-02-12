import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PerformanceChart } from './performance-chart';
import { MetricsTable } from './metrics-table';
import { performanceMonitor } from '@/services/performance-monitor';
import { MetricType } from '@/utils/performance';
import { COMPONENT_BUDGETS } from '@/config/performance-budgets';

const METRIC_TYPES: MetricType[] = ['render', 'event', 'query', 'error', 'memory'];
const COMPONENTS = Object.keys(COMPONENT_BUDGETS);

export function PerformanceDashboard() {
  const [selectedType, setSelectedType] = useState<MetricType>('render');
  const [selectedComponent, setSelectedComponent] = useState<string>('');
  const [metrics, setMetrics] = useState(performanceMonitor.getMetrics());
  const [view, setView] = useState('chart');

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics({
        type: selectedType,
        component: selectedComponent || undefined
      }));
    };

    const cleanup = performanceMonitor.subscribe(() => {
      updateMetrics();
    });

    updateMetrics();
    return cleanup;
  }, [selectedType, selectedComponent]);

  const filteredMetrics = metrics.filter(metric => {
    if (selectedType && metric.type !== selectedType) return false;
    if (selectedComponent && (!metric.metadata?.component || metric.metadata.component !== selectedComponent)) return false;
    return true;
  });

  return (
    <Card className="p-6">
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Performance Dashboard</h2>
          <div className="flex items-center space-x-4">
            <Select
              value={selectedType}
              onValueChange={(value) => setSelectedType(value as MetricType)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select metric type" />
              </SelectTrigger>
              <SelectContent>
                {METRIC_TYPES.map(type => (
                  <SelectItem key={type} value={type}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedComponent}
              onValueChange={setSelectedComponent}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select component" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Components</SelectItem>
                {COMPONENTS.map(component => (
                  <SelectItem key={component} value={component}>
                    {component}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={view} onValueChange={setView} className="w-full">
          <TabsList>
            <TabsTrigger value="chart">Chart View</TabsTrigger>
            <TabsTrigger value="table">Table View</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="mt-4">
            <PerformanceChart
              metrics={filteredMetrics}
              type={selectedType}
              component={selectedComponent}
              height={400}
            />
          </TabsContent>

          <TabsContent value="table" className="mt-4">
            <MetricsTable
              metrics={filteredMetrics}
              component={selectedComponent}
            />
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Average Duration
            </h3>
            <p className="text-2xl font-bold">
              {filteredMetrics.length > 0
                ? `${(filteredMetrics.reduce((sum, m) => sum + m.duration, 0) / filteredMetrics.length).toFixed(2)}ms`
                : 'N/A'}
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Max Duration
            </h3>
            <p className="text-2xl font-bold">
              {filteredMetrics.length > 0
                ? `${Math.max(...filteredMetrics.map(m => m.duration)).toFixed(2)}ms`
                : 'N/A'}
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Total Metrics
            </h3>
            <p className="text-2xl font-bold">
              {filteredMetrics.length}
            </p>
          </Card>

          <Card className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">
              Performance Score
            </h3>
            <p className="text-2xl font-bold">
              {filteredMetrics.length > 0 && selectedComponent && COMPONENT_BUDGETS[selectedComponent]
                ? `${Math.max(0, 100 - (filteredMetrics.filter(m => 
                    m.duration > COMPONENT_BUDGETS[selectedComponent].warning
                  ).length / filteredMetrics.length * 100)).toFixed(0)}%`
                : 'N/A'}
            </p>
          </Card>
        </div>
      </div>
    </Card>
  );
} 