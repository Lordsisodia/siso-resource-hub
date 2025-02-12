import { describe, it, expect } from 'vitest';
import {
  performanceConfig,
  calculateRegression,
  isSignificantRegression,
  isSignificantImprovement,
  aggregateResults,
  formatTestResults,
} from './performance-test-config';
import { MetricType } from '@/utils/performance';

describe('Performance Test Configuration', () => {
  describe('Configuration Validation', () => {
    it('should have valid iteration counts', () => {
      expect(performanceConfig.iterations).toBeGreaterThan(0);
      expect(performanceConfig.warmupIterations).toBeGreaterThan(0);
      expect(performanceConfig.iterations).toBeGreaterThan(performanceConfig.warmupIterations);
    });

    it('should have valid thresholds', () => {
      expect(performanceConfig.maxRegressionThreshold).toBeGreaterThan(0);
      expect(performanceConfig.minImprovementThreshold).toBeGreaterThan(0);
      expect(performanceConfig.maxRegressionThreshold).toBeGreaterThan(
        performanceConfig.minImprovementThreshold
      );
    });

    it('should have valid critical paths', () => {
      performanceConfig.criticalPaths.forEach(path => {
        expect(path.name).toBeTruthy();
        expect(path.route).toMatch(/^\//);
        expect(path.expectedLoadTime).toBeGreaterThan(0);
        expect(path.maxRenderTime).toBeGreaterThan(0);
        expect(path.maxRenderTime).toBeLessThan(path.expectedLoadTime);
      });
    });

    it('should have valid component thresholds', () => {
      Object.entries(performanceConfig.componentThresholds).forEach(([component, thresholds]) => {
        expect(thresholds.renderTime).toBeGreaterThan(0);
        expect(thresholds.reRenderTime).toBeGreaterThan(0);
        expect(thresholds.reRenderTime).toBeLessThan(thresholds.renderTime);
        
        if (thresholds.maxMemoryUsage) {
          expect(thresholds.maxMemoryUsage).toBeGreaterThan(0);
        }
      });
    });

    it('should have valid API thresholds', () => {
      Object.entries(performanceConfig.apiThresholds).forEach(([api, thresholds]) => {
        expect(thresholds.responseTime).toBeGreaterThan(0);
        expect(thresholds.maxRetries).toBeGreaterThanOrEqual(0);
        expect(thresholds.timeout).toBeGreaterThan(thresholds.responseTime);
      });
    });
  });

  describe('Performance Calculations', () => {
    it('should calculate regression correctly', () => {
      expect(calculateRegression(100, 120)).toBe(20); // 20% regression
      expect(calculateRegression(100, 80)).toBe(-20); // 20% improvement
      expect(calculateRegression(100, 100)).toBe(0); // No change
    });

    it('should identify significant regressions', () => {
      expect(isSignificantRegression(performanceConfig.maxRegressionThreshold + 1)).toBe(true);
      expect(isSignificantRegression(performanceConfig.maxRegressionThreshold - 1)).toBe(false);
    });

    it('should identify significant improvements', () => {
      expect(isSignificantImprovement(performanceConfig.minImprovementThreshold + 1)).toBe(true);
      expect(isSignificantImprovement(performanceConfig.minImprovementThreshold - 1)).toBe(false);
    });
  });

  describe('Results Aggregation', () => {
    const testData = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    it('should calculate statistics correctly', () => {
      const results = aggregateResults(testData);
      expect(results.mean).toBe(5.5); // (1 + ... + 10) / 10
      expect(results.median).toBe(5);
      expect(results.p95).toBe(10);
      expect(results.stdDev).toBeCloseTo(2.8722813232690143);
    });

    it('should handle empty arrays', () => {
      const results = aggregateResults([]);
      expect(results.mean).toBe(0);
      expect(results.median).toBe(0);
      expect(results.p95).toBe(0);
      expect(results.stdDev).toBe(0);
    });

    it('should handle single value arrays', () => {
      const results = aggregateResults([42]);
      expect(results.mean).toBe(42);
      expect(results.median).toBe(42);
      expect(results.p95).toBe(42);
      expect(results.stdDev).toBe(0);
    });
  });

  describe('Results Formatting', () => {
    it('should format test results correctly', () => {
      const baseline: Record<MetricType, number> = {
        render: 100,
        query: 200,
        mutation: 150,
        event: 50,
        validation: 75,
        navigation: 125
      };

      const current: Record<MetricType, number> = {
        render: 120,
        query: 180,
        mutation: 150,
        event: 50,
        validation: 75,
        navigation: 125
      };

      const report = formatTestResults('Test Case', baseline, current);
      
      expect(report).toContain('Performance Test Results: Test Case');
      expect(report).toContain('🔴 REGRESSION');
      expect(report).toContain('🟢 IMPROVEMENT');
      expect(report).toContain('20.00%'); // Regression
      expect(report).toContain('-10.00%'); // Improvement
    });

    it('should handle no changes', () => {
      const metrics: Record<MetricType, number> = {
        render: 100,
        query: 100,
        mutation: 100,
        event: 100,
        validation: 100,
        navigation: 100
      };

      const report = formatTestResults('No Changes', metrics, metrics);
      expect(report).toContain('🟡 NO CHANGE');
      expect(report).toContain('0.00%');
    });
  });
}); 