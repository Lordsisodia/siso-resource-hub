import { describe, it, expect } from 'vitest';
import {
  checkPerformanceBudget,
  calculatePercentile,
  aggregateMetrics,
  GLOBAL_BUDGETS,
  COMPONENT_BUDGETS,
} from './performance-budgets';

describe('Performance Budgets', () => {
  describe('checkPerformanceBudget', () => {
    it('should correctly identify values within budget', () => {
      const result = checkPerformanceBudget('render', 10);
      expect(result.isWarning).toBe(false);
      expect(result.isError).toBe(false);
    });

    it('should identify warning level violations', () => {
      const result = checkPerformanceBudget('render', 20);
      expect(result.isWarning).toBe(true);
      expect(result.isError).toBe(false);
    });

    it('should identify error level violations', () => {
      const result = checkPerformanceBudget('render', 50);
      expect(result.isWarning).toBe(false);
      expect(result.isError).toBe(true);
    });

    it('should check component-specific budgets', () => {
      const result = checkPerformanceBudget('render', 80, 'Auth');
      expect(result.isWarning).toBe(false);
      expect(result.isError).toBe(false);
      expect(result.budget).toBe(COMPONENT_BUDGETS['Auth']);
    });

    it('should fallback to infinite budget for unknown components', () => {
      const result = checkPerformanceBudget('render', 1000, 'UnknownComponent');
      expect(result.isWarning).toBe(false);
      expect(result.isError).toBe(false);
      expect(result.budget).toEqual({ warning: Infinity, error: Infinity });
    });
  });

  describe('calculatePercentile', () => {
    it('should calculate percentiles correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      expect(calculatePercentile(values, 50)).toBe(5);
      expect(calculatePercentile(values, 95)).toBe(10);
      expect(calculatePercentile(values, 25)).toBe(3);
    });

    it('should handle empty arrays', () => {
      expect(calculatePercentile([], 95)).toBe(0);
    });

    it('should handle single value arrays', () => {
      expect(calculatePercentile([42], 95)).toBe(42);
    });
  });

  describe('aggregateMetrics', () => {
    const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    it('should calculate average for query metrics', () => {
      const result = aggregateMetrics(values, 'query');
      expect(result).toBe(55); // (10 + ... + 100) / 10
    });

    it('should calculate p95 for render metrics', () => {
      const result = aggregateMetrics(values, 'render');
      expect(result).toBe(100); // 95th percentile of values
    });

    it('should calculate max for validation metrics', () => {
      const result = aggregateMetrics(values, 'validation');
      expect(result).toBe(100); // max value
    });

    it('should handle empty arrays', () => {
      expect(aggregateMetrics([], 'render')).toBe(0);
    });
  });

  describe('Budget Configurations', () => {
    it('should have valid global budgets', () => {
      Object.entries(GLOBAL_BUDGETS).forEach(([type, budget]) => {
        expect(budget.warning).toBeLessThan(budget.error);
        expect(budget.aggregationType).toBeOneOf(['average', 'p95', 'max']);
      });
    });

    it('should have valid component budgets', () => {
      Object.entries(COMPONENT_BUDGETS).forEach(([component, budget]) => {
        expect(budget.warning).toBeLessThan(budget.error);
        if (budget.maxRenderCount) {
          expect(budget.maxRenderCount).toBeGreaterThan(0);
        }
        if (budget.maxMemoryUsage) {
          expect(budget.maxMemoryUsage).toBeGreaterThan(0);
        }
      });
    });
  });
}); 