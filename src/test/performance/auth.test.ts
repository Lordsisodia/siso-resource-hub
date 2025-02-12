
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Auth from '@/pages/Auth';
import { performanceConfig } from '@/config/performance-test-config';
import { performanceMonitor } from '@/services/performance-monitor';
import { measureExecutionTime } from '@/utils/performance';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
    },
  },
}));

vi.mock('@/utils/performance', () => ({
  measureExecutionTime: vi.fn((fn) => fn()),
  MetricType: {
    render: 'render',
    event: 'event',
    query: 'query',
  },
}));

describe('Auth Component Performance', () => {
  beforeEach(() => {
    performanceMonitor.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Initial Render Performance', () => {
    it('should render within performance budget', async () => {
      const startTime = performance.now();
      
      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(performanceConfig.componentThresholds.Auth.renderTime);
    });

    it('should not exceed memory budget during render', async () => {
      const memoryBefore = performance.memory?.usedJSHeapSize || 0;
      
      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );
      
      const memoryAfter = performance.memory?.usedJSHeapSize || 0;
      const memoryUsed = memoryAfter - memoryBefore;
      
      if (performanceConfig.componentThresholds.Auth.maxMemoryUsage) {
        expect(memoryUsed).toBeLessThan(performanceConfig.componentThresholds.Auth.maxMemoryUsage);
      }
    });
  });

  describe('Form Interaction Performance', () => {
    it('should handle form submission within performance budget', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: { session: { user: { id: '123' } } },
        error: null,
      } as any);

      const { getByPlaceholderText, getByText } = render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const startInputTime = performance.now();
      fireEvent.change(getByPlaceholderText('Work Email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(getByPlaceholderText('Create Password'), {
        target: { value: 'password123' },
      });
      const inputTime = performance.now() - startInputTime;
      expect(inputTime).toBeLessThan(performanceConfig.componentThresholds.Auth.reRenderTime);

      const startSubmitTime = performance.now();
      fireEvent.click(getByText('Create Account'));
      
      await waitFor(() => {
        const submitTime = performance.now() - startSubmitTime;
        expect(submitTime).toBeLessThan(performanceConfig.apiThresholds.auth.responseTime);
      });
    });

    it('should handle OAuth sign-in click within performance budget', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google' },
        error: null,
      } as any);

      const { getByText } = render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const startTime = performance.now();
      fireEvent.click(getByText('Continue with Google'));
      
      await waitFor(() => {
        const clickTime = performance.now() - startTime;
        expect(clickTime).toBeLessThan(performanceConfig.componentThresholds.Auth.reRenderTime);
      });
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track render metrics correctly', () => {
      render(
        <BrowserRouter>
          <Auth />
        </BrowserRouter>
      );

      const renderMetrics = performanceMonitor.getMetricsByType('render');
      expect(renderMetrics.length).toBeGreaterThan(0);
      expect(renderMetrics[0].duration).toBeLessThan(
        performanceConfig.componentThresholds.Auth.renderTime
      );
    });
  });
});
