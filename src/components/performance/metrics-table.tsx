import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { PerformanceMetric } from '@/utils/performance';
import { COMPONENT_BUDGETS } from '@/config/performance-budgets';
import { AlertCircle, AlertTriangle, CheckCircle, ArrowUpDown } from 'lucide-react';

interface MetricsTableProps {
  metrics: PerformanceMetric[];
  component?: string;
  className?: string;
}

type SortField = 'duration' | 'timestamp' | 'type' | 'id';
type SortDirection = 'asc' | 'desc';

export function MetricsTable({ metrics, component, className }: MetricsTableProps) {
  const [sortField, setSortField] = useState<SortField>('timestamp');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filter, setFilter] = useState('');

  const budget = component && COMPONENT_BUDGETS[component];

  const sortedAndFilteredMetrics = useMemo(() => {
    let result = [...metrics];

    // Apply filter
    if (filter) {
      const lowerFilter = filter.toLowerCase();
      result = result.filter(metric => 
        metric.id.toLowerCase().includes(lowerFilter) ||
        metric.type.toLowerCase().includes(lowerFilter)
      );
    }

    // Apply sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'duration':
          comparison = a.duration - b.duration;
          break;
        case 'timestamp':
          comparison = a.timestamp - b.timestamp;
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'id':
          comparison = a.id.localeCompare(b.id);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [metrics, sortField, sortDirection, filter]);

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getPerformanceStatus = (duration: number) => {
    if (!budget) return 'normal';
    if (duration >= budget.error) return 'error';
    if (duration >= budget.warning) return 'warning';
    return 'normal';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return <CheckCircle className="h-4 w-4 text-success" />;
    }
  };

  const getStatusBadge = (type: string) => {
    switch (type) {
      case 'render':
        return <Badge variant="secondary">Render</Badge>;
      case 'event':
        return <Badge variant="outline">Event</Badge>;
      case 'query':
        return <Badge variant="default">Query</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'memory':
        return <Badge variant="secondary">Memory</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Card className={className}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">
            {component ? `${component} Metrics` : 'Performance Metrics'}
          </h3>
          <Input
            placeholder="Filter metrics..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Status</TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('type')}
                    className="flex items-center space-x-1"
                  >
                    Type
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('id')}
                    className="flex items-center space-x-1"
                  >
                    ID
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('duration')}
                    className="flex items-center space-x-1 ml-auto"
                  >
                    Duration
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button
                    variant="ghost"
                    onClick={() => handleSort('timestamp')}
                    className="flex items-center space-x-1 ml-auto"
                  >
                    Timestamp
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedAndFilteredMetrics.map((metric, index) => {
                const status = getPerformanceStatus(metric.duration);
                return (
                  <TableRow key={`${metric.id}-${index}`}>
                    <TableCell>
                      {getStatusIcon(status)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(metric.type)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {metric.id}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {metric.duration.toFixed(2)}ms
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {format(new Date(metric.timestamp), 'HH:mm:ss')}
                    </TableCell>
                  </TableRow>
                );
              })}
              {sortedAndFilteredMetrics.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    No metrics available
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </Card>
  );
}
 