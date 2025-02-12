import { MetricType } from '@/utils/performance';

export interface PerformanceTestConfig {
  // Test iterations for reliable results
  iterations: number;
  warmupIterations: number;
  
  // Thresholds
  maxRegressionThreshold: number;
  minImprovementThreshold: number;
  
  // Critical paths to monitor
  criticalPaths: {
    name: string;
    route: string;
    expectedLoadTime: number;
    maxRenderTime: number;
  }[];
  
  // Component-specific thresholds
  componentThresholds: {
    [key: string]: {
      renderTime: number;
      reRenderTime: number;
      maxMemoryUsage?: number;
    };
  };
  
  // API performance thresholds
  apiThresholds: {
    [key: string]: {
      responseTime: number;
      maxRetries: number;
      timeout: number;
    };
  };
}

export const performanceConfig: PerformanceTestConfig = {
  iterations: 5,
  warmupIterations: 2,
  maxRegressionThreshold: 0.2, // 20% regression
  minImprovementThreshold: 0.1, // 10% improvement

  criticalPaths: [
    {
      name: 'Auth Flow',
      route: '/auth',
      expectedLoadTime: 1000,
      maxRenderTime: 300
    },
    {
      name: 'Home Dashboard',
      route: '/home',
      expectedLoadTime: 1500,
      maxRenderTime: 500
    }
  ],

  componentThresholds: {
    Auth: {
      renderTime: 100,
      reRenderTime: 50,
      maxMemoryUsage: 5 * 1024 * 1024 // 5MB
    },
    VirtualList: {
      renderTime: 16, // 60fps target
      reRenderTime: 8,
      maxMemoryUsage: 10 * 1024 * 1024 // 10MB
    }
  },

  apiThresholds: {
    auth: {
      responseTime: 2000,
      maxRetries: 3,
      timeout: 5000
    },
    query: {
      responseTime: 1000,
      maxRetries: 2,
      timeout: 3000
    }
  }
};

export function calculateRegression(baseline: number, current: number): number {
  return (current - baseline) / baseline;
}

export function isSignificantRegression(regression: number): boolean {
  return regression > performanceConfig.maxRegressionThreshold;
}

export function isSignificantImprovement(improvement: number): boolean {
  return improvement < -performanceConfig.minImprovementThreshold;
}

export function aggregateResults(results: number[]): {
  mean: number;
  median: number;
  p95: number;
  stdDev: number;
} {
  if (results.length === 0) {
    return { mean: 0, median: 0, p95: 0, stdDev: 0 };
  }

  const sorted = [...results].sort((a, b) => a - b);
  const mean = results.reduce((a, b) => a + b, 0) / results.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  const variance = results.reduce((acc, val) => {
    const diff = val - mean;
    return acc + diff * diff;
  }, 0) / results.length;

  const stdDev = Math.sqrt(variance);

  return { mean, median, p95, stdDev };
}

export function formatTestResults(
  testName: string,
  baseline: Record<MetricType, number>,
  current: Record<MetricType, number>
): string {
  let output = `Performance Test Results for ${testName}\n\n`;

  Object.entries(baseline).forEach(([metric, baselineValue]) => {
    const currentValue = current[metric as MetricType];
    const regression = calculateRegression(baselineValue, currentValue);
    const isRegression = isSignificantRegression(regression);
    const isImprovement = isSignificantImprovement(regression);

    output += `${metric}:\n`;
    output += `  Baseline: ${baselineValue.toFixed(2)}ms\n`;
    output += `  Current:  ${currentValue.toFixed(2)}ms\n`;
    output += `  Change:   ${(regression * 100).toFixed(1)}%\n`;
    
    if (isRegression) {
      output += `  ⚠️ Significant regression detected\n`;
    } else if (isImprovement) {
      output += `  ✅ Significant improvement detected\n`;
    }
    
    output += '\n';
  });

  return output;
} 