import { MetricType } from '@/services/optimized-performance-monitor';

interface Budget {
  warning: number;
  error: number;
}

interface BudgetConfig {
  [key: string]: Budget;
}

export const GLOBAL_BUDGETS: Record<MetricType, Budget> = {
  render: {
    warning: 16, // 1 frame at 60fps
    error: 33 // 2 frames at 60fps
  },
  event: {
    warning: 100,
    error: 300
  },
  query: {
    warning: 500,
    error: 1000
  },
  error: {
    warning: 0,
    error: 0
  },
  memory: {
    warning: 80, // 80% of heap limit
    error: 90 // 90% of heap limit
  }
};

export const ComponentBudgets: BudgetConfig = {
  AuthForm: {
    warning: 50,
    error: 100
  },
  OptimizedFormField: {
    warning: 8,
    error: 16
  },
  SocialAuthButtons: {
    warning: 8,
    error: 16
  }
};

export interface ComponentBudget extends Budget {
  maxRenderCount?: number;
  maxMemoryUsage?: number;
}

export interface MetricBudget extends Budget {
  aggregationType: 'average' | 'p95' | 'max';
}

export const GLOBAL_BUDGETS: Record<MetricType, MetricBudget> = {
  render: {
    warning: 16, // 16ms = 60fps
    error: 33, // 33ms = 30fps
    aggregationType: 'p95',
  },
  query: {
    warning: 200,
    error: 500,
    aggregationType: 'average',
  },
  mutation: {
    warning: 300,
    error: 1000,
    aggregationType: 'average',
  },
  validation: {
    warning: 10,
    error: 50,
    aggregationType: 'max',
  },
  navigation: {
    warning: 300,
    error: 1000,
    aggregationType: 'p95',
  },
};

export interface ComponentBudgets {
  [key: string]: ComponentBudget;
}

export const COMPONENT_BUDGETS: ComponentBudgets = {
  Auth: {
    warning: 100,
    error: 200,
    maxMemoryUsage: 5 * 1024 * 1024 // 5MB
  },
  Dashboard: {
    warning: 150,
    error: 300,
    maxMemoryUsage: 10 * 1024 * 1024 // 10MB
  },
  VirtualList: {
    warning: 16, // Target 60fps
    error: 32,
    maxMemoryUsage: 20 * 1024 * 1024 // 20MB
  },
  Form: {
    warning: 50,
    error: 100
  },
  Modal: {
    warning: 50,
    error: 100
  },
  Table: {
    warning: 100,
    error: 200,
    maxMemoryUsage: 15 * 1024 * 1024 // 15MB
  }
};

export const API_BUDGETS = {
  auth: {
    warning: 1000,  // 1s
    error: 2000,    // 2s
    timeout: 5000   // 5s
  },
  query: {
    warning: 500,   // 500ms
    error: 1000,    // 1s
    timeout: 3000   // 3s
  },
  mutation: {
    warning: 1000,  // 1s
    error: 2000,    // 2s
    timeout: 5000   // 5s
  }
};

export const NAVIGATION_BUDGETS = {
  pageLoad: {
    warning: 1500,  // 1.5s
    error: 3000     // 3s
  },
  transition: {
    warning: 300,   // 300ms
    error: 500      // 500ms
  }
};

export const RESOURCE_BUDGETS = {
  image: {
    warning: 100 * 1024,    // 100KB
    error: 500 * 1024       // 500KB
  },
  script: {
    warning: 200 * 1024,    // 200KB
    error: 1024 * 1024      // 1MB
  },
  stylesheet: {
    warning: 50 * 1024,     // 50KB
    error: 200 * 1024       // 200KB
  },
  total: {
    warning: 2 * 1024 * 1024,    // 2MB
    error: 5 * 1024 * 1024       // 5MB
  }
};

// Performance budget checker
export function checkPerformanceBudget(
  type: MetricType,
  value: number,
  component?: string
): { isWarning: boolean; isError: boolean; budget: Budget } {
  const budget = component
    ? COMPONENT_BUDGETS[component]
    : GLOBAL_BUDGETS[type];

  if (!budget) {
    return {
      isWarning: false,
      isError: false,
      budget: { warning: Infinity, error: Infinity },
    };
  }

  return {
    isWarning: value >= budget.warning && value < budget.error,
    isError: value >= budget.error,
    budget,
  };
}

// Helper to calculate percentile
export function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

// Aggregate metrics based on configuration
export function aggregateMetrics(
  values: number[],
  type: MetricType
): number {
  if (values.length === 0) return 0;

  const config = GLOBAL_BUDGETS[type];
  switch (config.aggregationType) {
    case 'average':
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    case 'p95':
      return calculatePercentile(values, 95);
    case 'max':
      return Math.max(...values);
    default:
      return 0;
  }
} 