import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import { MetricType } from '@/utils/performance';
import { GLOBAL_BUDGETS } from '@/config/performance-budgets';

interface MetricsSummaryProps {
  metrics: Array<{
    type: MetricType;
    duration: number;
  }>;
  className?: string;
}

function calculateMetricStats(metrics: MetricsSummaryProps['metrics'], type: MetricType) {
  const typeMetrics = metrics.filter(m => m.type === type);
  if (typeMetrics.length === 0) return { avg: 0, p95: 0, max: 0 };

  const durations = typeMetrics.map(m => m.duration);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const max = Math.max(...durations);
  const sorted = [...durations].sort((a, b) => a - b);
  const p95Index = Math.floor(sorted.length * 0.95);
  const p95 = sorted[p95Index];

  return { avg, p95, max };
}

function MetricCard({ type, stats }: { type: MetricType; stats: { avg: number; p95: number; max: number } }) {
  const budget = GLOBAL_BUDGETS[type];
  const isWarning = stats.p95 >= budget.warning;
  const isError = stats.p95 >= budget.error;

  return (
    <Card className={cn(
      "p-4",
      isError && "border-destructive",
      isWarning && !isError && "border-warning"
    )}>
      <h3 className="text-sm font-medium capitalize mb-2">{type}</h3>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground flex justify-between">
          Average
          <span className="font-medium text-foreground">{stats.avg.toFixed(1)}ms</span>
        </p>
        <p className="text-xs text-muted-foreground flex justify-between">
          P95
          <span className={cn(
            "font-medium",
            isError && "text-destructive",
            isWarning && !isError && "text-warning"
          )}>
            {stats.p95.toFixed(1)}ms
          </span>
        </p>
        <p className="text-xs text-muted-foreground flex justify-between">
          Max
          <span className="font-medium text-foreground">{stats.max.toFixed(1)}ms</span>
        </p>
      </div>
    </Card>
  );
}

export function MetricsSummary({ metrics, className }: MetricsSummaryProps) {
  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4", className)}>
      {Object.keys(GLOBAL_BUDGETS).map((type) => (
        <MetricCard
          key={type}
          type={type as MetricType}
          stats={calculateMetricStats(metrics, type as MetricType)}
        />
      ))}
    </div>
  );
} 