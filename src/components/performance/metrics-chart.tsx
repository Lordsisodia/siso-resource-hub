import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Card } from '@/components/ui/card';
import { MetricType } from '@/utils/performance';
import { cn } from '@/utils/cn';

interface MetricsChartProps {
  data: Array<{
    timestamp: number;
    type: MetricType;
    duration: number;
    id: string;
  }>;
  height?: number;
  className?: string;
}

const METRIC_COLORS = {
  render: 'var(--siso-red)',
  query: 'var(--siso-orange)',
  mutation: 'var(--siso-yellow)',
  event: 'var(--siso-green)',
  validation: 'var(--siso-blue)',
  navigation: 'var(--siso-purple)',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <Card className="p-3 bg-background border-border">
        <p className="text-sm font-medium">
          {new Date(label).toLocaleTimeString()}
        </p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2 mt-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <p className="text-sm">
              {entry.name}: {entry.value.toFixed(2)}ms
            </p>
          </div>
        ))}
      </Card>
    );
  }
  return null;
};

export function MetricsChart({ data, height = 300, className }: MetricsChartProps) {
  const chartData = useMemo(() => {
    const groupedData = data.reduce((acc, metric) => {
      const timestamp = metric.timestamp;
      if (!acc[timestamp]) {
        acc[timestamp] = {
          timestamp,
          render: 0,
          query: 0,
          mutation: 0,
          event: 0,
          validation: 0,
          navigation: 0,
        };
      }
      acc[timestamp][metric.type] = metric.duration;
      return acc;
    }, {} as Record<number, any>);

    return Object.values(groupedData).sort((a, b) => a.timestamp - b.timestamp);
  }, [data]);

  return (
    <Card className={cn("p-4", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            opacity={0.2}
          />
          <XAxis
            dataKey="timestamp"
            tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
            stroke="var(--muted-foreground)"
            fontSize={12}
          />
          <YAxis
            stroke="var(--muted-foreground)"
            fontSize={12}
            tickFormatter={(value) => `${value}ms`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          {Object.entries(METRIC_COLORS).map(([type, color]) => (
            <Line
              key={type}
              type="monotone"
              dataKey={type}
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
} 