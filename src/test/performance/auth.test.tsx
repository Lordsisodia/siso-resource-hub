import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Auth } from '@/pages/Auth';
import { performanceMonitor } from '@/services/performance-monitor';
import { COMPONENT_BUDGETS } from '@/config/performance-budgets';
import { supabase } from '@/integrations/supabase/client';

// Mock window.performance.memory
declare global {
  interface Performance {
    memory?: {
      jsHeapSizeLimit: number;
      totalJSHeapSize: number;
      usedJSHeapSize: number;
    };
  }
}

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn()
    }
  }
}));

vi.mock('@/services/performance-monitor', () => ({
  performanceMonitor: {
    addMetric: vi.fn(),
    getMetrics: vi.fn(() => []),
    clearMetrics: vi.fn(),
    getMetricsByType: vi.fn(() => [])
  }
}));

const MOCK_BUDGETS = {
  Auth: {
    renderTime: 100,
    reRenderTime: 50,
    maxMemoryUsage: 5 * 1024 * 1024, // 5MB
  },
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Auth Component Performance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    performanceMonitor.clearMetrics();
    // Reset performance metrics
    window.performance.memory = {
      jsHeapSizeLimit: 2172649472,
      totalJSHeapSize: 0,
      usedJSHeapSize: 0,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Render Performance', () => {
    it('should render within performance budget', async () => {
      const startTime = performance.now();
      
      render(<Auth />, { wrapper: TestWrapper });
      
      const renderTime = performance.now() - startTime;
      expect(renderTime).toBeLessThan(MOCK_BUDGETS.Auth.renderTime);
    });

    it('should track render metrics', async () => {
      render(<Auth />, { wrapper: TestWrapper });

      expect(performanceMonitor.addMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'Auth-render',
          type: 'render',
          duration: expect.any(Number),
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('Interaction Performance', () => {
    it('should handle form submission within performance budget', async () => {
      const { getByRole } = render(<Auth />, { wrapper: TestWrapper });
      
      const startTime = performance.now();
      fireEvent.submit(getByRole('form'));
      
      const submitTime = performance.now() - startTime;
      expect(submitTime).toBeLessThanOrEqual(COMPONENT_BUDGETS.Auth.warning);
    });

    it('should track form submission metrics', async () => {
      const { getByRole } = render(<Auth />, { wrapper: TestWrapper });
      
      fireEvent.submit(getByRole('form'));

      await waitFor(() => {
        expect(performanceMonitor.addMetric).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'Auth-submit',
            type: 'event',
            duration: expect.any(Number),
            timestamp: expect.any(Number)
          })
        );
      });
    });
  });

  describe('Memory Usage', () => {
    it('should not exceed memory budget during render', async () => {
      const memoryBefore = window.performance.memory?.usedJSHeapSize || 0;
      
      render(<Auth />, { wrapper: TestWrapper });
      
      const memoryAfter = window.performance.memory?.usedJSHeapSize || 0;
      const memoryUsed = memoryAfter - memoryBefore;
      
      expect(memoryUsed).toBeLessThanOrEqual(MOCK_BUDGETS.Auth.maxMemoryUsage);
    });

    it('should not have memory leaks after unmount', () => {
      const memoryBefore = window.performance.memory?.usedJSHeapSize || 0;
      
      const { unmount } = render(<Auth />, { wrapper: TestWrapper });
      unmount();
      
      vi.runAllTimers();
      
      const memoryAfter = window.performance.memory?.usedJSHeapSize || 0;
      expect(memoryAfter).toBeLessThanOrEqual(memoryBefore * 1.1); // Allow 10% overhead
    });
  });

  describe('Form Interaction Performance', () => {
    it('should handle Google sign-in click within performance budget', async () => {
      vi.mocked(supabase.auth.signInWithOAuth).mockResolvedValue({
        data: { provider: 'google' },
        error: null
      });

      const { getByText } = render(<Auth />, { wrapper: TestWrapper });

      const startTime = performance.now();
      fireEvent.click(getByText('Continue with Google'));
      
      await waitFor(() => {
        const clickTime = performance.now() - startTime;
        expect(clickTime).toBeLessThan(COMPONENT_BUDGETS.Auth.warning);
      });
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track event metrics for user interactions', async () => {
      const { getByText } = render(<Auth />, { wrapper: TestWrapper });

      fireEvent.click(getByText('Skip for now'));

      expect(performanceMonitor.addMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'event',
          duration: expect.any(Number),
          timestamp: expect.any(Number)
        })
      );
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle errors within performance budget', async () => {
      vi.mocked(supabase.auth.signUp).mockRejectedValue(new Error('Test error'));

      const { getByPlaceholderText, getByText } = render(<Auth />, { wrapper: TestWrapper });

      fireEvent.change(getByPlaceholderText('Work Email'), {
        target: { value: 'test@example.com' }
      });
      fireEvent.change(getByPlaceholderText('Create Password'), {
        target: { value: 'password123' }
      });

      const startTime = performance.now();
      fireEvent.click(getByText('Create Account'));

      await waitFor(() => {
        const errorHandlingTime = performance.now() - startTime;
        expect(errorHandlingTime).toBeLessThan(COMPONENT_BUDGETS.Auth.warning);
      });
    });
  });

  describe('Navigation Performance', () => {
    it('should handle navigation transitions within budget', async () => {
      const { getByText } = render(<Auth />, { wrapper: TestWrapper });

      const startTime = performance.now();
      fireEvent.click(getByText('Skip for now'));

      await waitFor(() => {
        const navigationTime = performance.now() - startTime;
        expect(navigationTime).toBeLessThan(COMPONENT_BUDGETS.Auth.warning);
      });
    });
  });

  it('should not trigger unnecessary re-renders', async () => {
    const { rerender } = render(<Auth />, { wrapper: TestWrapper });
    
    const startTime = performance.now();
    rerender(<Auth />);
    const reRenderTime = performance.now() - startTime;
    
    expect(reRenderTime).toBeLessThan(MOCK_BUDGETS.Auth.reRenderTime);
  });
}); 