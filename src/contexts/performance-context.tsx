import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { measureExecutionTime } from '@/utils/performance';

interface PerformanceMetric {
  id: string;
  type: 'render' | 'query' | 'mutation' | 'event';
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceState {
  metrics: PerformanceMetric[];
  slowThreshold: number;
  isRecording: boolean;
}

type PerformanceAction =
  | { type: 'ADD_METRIC'; payload: PerformanceMetric }
  | { type: 'CLEAR_METRICS' }
  | { type: 'SET_THRESHOLD'; payload: number }
  | { type: 'SET_RECORDING'; payload: boolean };

interface PerformanceContextValue extends PerformanceState {
  addMetric: (metric: Omit<PerformanceMetric, 'timestamp'>) => void;
  clearMetrics: () => void;
  setThreshold: (threshold: number) => void;
  setRecording: (isRecording: boolean) => void;
  getAverageMetric: (type: PerformanceMetric['type']) => number;
  getSlowMetrics: () => PerformanceMetric[];
}

const initialState: PerformanceState = {
  metrics: [],
  slowThreshold: 100, // 100ms threshold
  isRecording: true,
};

function performanceReducer(state: PerformanceState, action: PerformanceAction): PerformanceState {
  switch (action.type) {
    case 'ADD_METRIC':
      return {
        ...state,
        metrics: [...state.metrics, action.payload].slice(-1000), // Keep last 1000 metrics
      };
    case 'CLEAR_METRICS':
      return {
        ...state,
        metrics: [],
      };
    case 'SET_THRESHOLD':
      return {
        ...state,
        slowThreshold: action.payload,
      };
    case 'SET_RECORDING':
      return {
        ...state,
        isRecording: action.payload,
      };
    default:
      return state;
  }
}

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(performanceReducer, initialState);

  const addMetric = useCallback((metric: Omit<PerformanceMetric, 'timestamp'>) => {
    if (!state.isRecording) return;

    dispatch({
      type: 'ADD_METRIC',
      payload: {
        ...metric,
        timestamp: Date.now(),
      },
    });
  }, [state.isRecording]);

  const clearMetrics = useCallback(() => {
    dispatch({ type: 'CLEAR_METRICS' });
  }, []);

  const setThreshold = useCallback((threshold: number) => {
    dispatch({ type: 'SET_THRESHOLD', payload: threshold });
  }, []);

  const setRecording = useCallback((isRecording: boolean) => {
    dispatch({ type: 'SET_RECORDING', payload: isRecording });
  }, []);

  const getAverageMetric = useCallback((type: PerformanceMetric['type']) => {
    const typeMetrics = state.metrics.filter(m => m.type === type);
    if (typeMetrics.length === 0) return 0;
    
    const sum = typeMetrics.reduce((acc, curr) => acc + curr.duration, 0);
    return sum / typeMetrics.length;
  }, [state.metrics]);

  const getSlowMetrics = useCallback(() => {
    return state.metrics.filter(m => m.duration > state.slowThreshold);
  }, [state.metrics, state.slowThreshold]);

  const value = {
    ...state,
    addMetric,
    clearMetrics,
    setThreshold,
    setRecording,
    getAverageMetric,
    getSlowMetrics,
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
}

export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
}

// Wrapper for measuring performance
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  id: string
) {
  return function PerformanceTrackedComponent(props: P) {
    const { addMetric } = usePerformance();

    return (
      <React.Profiler
        id={id}
        onRender={(id, phase, actualDuration) => {
          addMetric({
            id,
            type: 'render',
            duration: actualDuration,
            metadata: { phase },
          });
        }}
      >
        <Component {...props} />
      </React.Profiler>
    );
  };
} 