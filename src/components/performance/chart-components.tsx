import React, { memo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ChartData {
  timestamp: string;
  duration: number;
  type: string;
}

interface ChartComponentsProps {
  data: ChartData[];
}

const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-siso-bg border border-siso-text/10 rounded-lg p-2 shadow-lg">
        <p className="text-sm text-siso-text-muted">{label}</p>
        <p className="text-sm font-medium text-siso-text">
          Duration: {payload[0].value.toFixed(2)}ms
        </p>
        <p className="text-xs text-siso-text-muted">
          Type: {payload[0].payload.type}
        </p>
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = 'CustomTooltip';

function ChartComponentsBase({ data }: ChartComponentsProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--siso-text-muted)"
          opacity={0.1}
        />
        <XAxis
          dataKey="timestamp"
          stroke="var(--siso-text-muted)"
          fontSize={12}
          tickMargin={8}
        />
        <YAxis
          stroke="var(--siso-text-muted)"
          fontSize={12}
          tickMargin={8}
          tickFormatter={(value) => `${value}ms`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="duration"
          stroke="var(--siso-red)"
          strokeWidth={2}
          dot={false}
          activeDot={{
            r: 4,
            stroke: 'var(--siso-red)',
            strokeWidth: 2,
            fill: 'var(--siso-bg)',
          }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Export memoized component
export default memo(ChartComponentsBase); 