import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useStore } from '@/store/root-store';
import { MetricsChart } from './metrics-chart';
import { MetricsSummary } from './metrics-summary';
import { performanceMonitor } from '@/services/performance-monitor';

export function PerformanceDashboard() {
  const [activeTab, setActiveTab] = useState('realtime');
  const [timeRange, setTimeRange] = useState(5); // minutes
  const { isRecording, slowThreshold, setRecording, setSlowThreshold } = useStore(
    state => ({
      isRecording: state.isRecording,
      slowThreshold: state.slowThreshold,
      setRecording: state.setRecording,
      setSlowThreshold: state.setSlowThreshold
    })
  );

  const [metrics, setMetrics] = useState(performanceMonitor.getMetrics());

  // Update metrics periodically
  useEffect(() => {
    if (activeTab !== 'realtime') return;

    const interval = setInterval(() => {
      setMetrics(performanceMonitor.getMetrics({
        timeRange: {
          start: Date.now() - timeRange * 60 * 1000,
          end: Date.now()
        }
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTab, timeRange]);

  const handleClearMetrics = () => {
    if (window.confirm('Are you sure you want to clear all metrics?')) {
      performanceMonitor.clearMetrics();
      setMetrics([]);
    }
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      setSlowThreshold(value);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">Performance Dashboard</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={isRecording}
              onCheckedChange={setRecording}
              id="recording"
            />
            <Label htmlFor="recording">Recording</Label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={slowThreshold}
              onChange={handleThresholdChange}
              className="w-20"
              min={1}
            />
            <Label>ms threshold</Label>
          </div>
          <Button
            variant="outline"
            onClick={handleClearMetrics}
          >
            Clear Metrics
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="realtime">Realtime</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Realtime Metrics</h3>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={timeRange}
                  onChange={(e) => setTimeRange(Math.max(1, parseInt(e.target.value) || 5))}
                  className="w-20"
                  min={1}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
            </div>
            <MetricsChart data={metrics} height={400} />
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card className="p-4">
            <h3 className="text-lg font-medium mb-4">Performance Summary</h3>
            <MetricsSummary metrics={metrics} />
          </Card>
        </TabsContent>
      </Tabs>

      {metrics.length === 0 && (
        <Card className="p-6 text-center">
          <p className="text-lg font-medium">No metrics recorded yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Enable recording and interact with the application to start collecting metrics
          </p>
        </Card>
      )}
    </div>
  );
} 