import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  BarChart,
  Bar
} from 'recharts';
import { format } from 'date-fns';
import { PerformanceMetric } from '@/utils/performance';
import { COMPONENT_BUDGETS } from '@/config/performance-budgets';

interface PerformanceChartProps {
  metrics: PerformanceMetric[];
  type: string;
  component?: string;
  height?: number;
  className?: string;
}

type ChartType = 'line' | 'area' | 'bar';

export function PerformanceChart({
  metrics,
  type,
  component,
  height = 300,
  className
}: PerformanceChartProps) {
  const [chartType, setChartType] = useState<ChartType>('line');
  const [timeRange, setTimeRange] = useState('1h');

  const chartData = useMemo(() => {
    const now = Date.now();
    const timeRangeMs = {
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
    }[timeRange];

    return metrics
      .filter(metric => now - metric.timestamp < timeRangeMs)
      .map(metric => ({
        timestamp: metric.timestamp,
        duration: metric.duration,
        formattedTime: format(new Date(metric.timestamp), 'HH:mm:ss'),
        type: metric.type,
        component: metric.metadata?.component || 'Unknown',
        memory: metric.metadata?.memory?.usedJSHeapSize
          ? Math.round(metric.metadata.memory.usedJSHeapSize / 1024 / 1024)
          : undefined
      }));
  }, [metrics, timeRange]);

  const budget = component && COMPONENT_BUDGETS[component];
  const warningThreshold = budget?.warning || 0;
  const errorThreshold = budget?.error || 0;

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    const commonAxisProps = {
      tick: { fontSize: 12 },
      className: "text-muted-foreground"
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="formattedTime" {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem'
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="duration"
              name="Duration"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
            />
            {warningThreshold > 0 && (
              <Area
                type="monotone"
                dataKey={() => warningThreshold}
                name="Warning Threshold"
                stroke="hsl(var(--warning))"
                fill="hsl(var(--warning))"
                fillOpacity={0.1}
                strokeDasharray="5 5"
              />
            )}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="formattedTime" {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem'
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            />
            <Legend />
            <Bar
              dataKey="duration"
              name="Duration"
              fill="hsl(var(--primary))"
            />
            {warningThreshold > 0 && (
              <Bar
                dataKey={() => warningThreshold}
                name="Warning Threshold"
                fill="hsl(var(--warning))"
                fillOpacity={0.5}
              />
            )}
          </BarChart>
        );

      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="formattedTime" {...commonAxisProps} />
            <YAxis {...commonAxisProps} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem'
              }}
              labelStyle={{ color: 'hsl(var(--muted-foreground))' }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="duration"
              name="Duration"
              stroke="hsl(var(--primary))"
              dot={false}
              activeDot={{ r: 4 }}
            />
            {warningThreshold > 0 && (
              <Line
                type="monotone"
                dataKey={() => warningThreshold}
                name="Warning Threshold"
                stroke="hsl(var(--warning))"
                strokeDasharray="5 5"
                dot={false}
              />
            )}
            {errorThreshold > 0 && (
              <Line
                type="monotone"
                dataKey={() => errorThreshold}
                name="Error Threshold"
                stroke="hsl(var(--destructive))"
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </LineChart>
        );
    }
  };

  return (
    <Card className={className}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {component ? `${component} Performance` : `${type} Metrics`}
          </h3>
          <div className="flex items-center space-x-4">
            <Select value={chartType} onValueChange={(value: ChartType) => setChartType(value)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Chart type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line">Line Chart</SelectItem>
                <SelectItem value="area">Area Chart</SelectItem>
                <SelectItem value="bar">Bar Chart</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15m">Last 15m</SelectItem>
                <SelectItem value="1h">Last 1h</SelectItem>
                <SelectItem value="6h">Last 6h</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer>
            {renderChart()}
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
} 