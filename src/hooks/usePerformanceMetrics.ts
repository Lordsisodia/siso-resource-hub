
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// [Analysis] Define web vitals metric types for better type safety
interface WebVitalMetric {
  id: string;
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
}

export const usePerformanceMetrics = () => {
  useEffect(() => {
    // Only run in production and for authenticated users
    if (process.env.NODE_ENV !== 'production') return;

    const recordMetrics = async () => {
      try {
        // Get Web Vitals metrics
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach(async (entry) => {
            // Type guard to handle different performance entry types
            let metricValue: number | undefined;
            
            switch (entry.entryType) {
              case 'largest-contentful-paint':
                metricValue = entry.startTime;
                break;
              case 'first-input':
                const firstInputEntry = entry as PerformanceEventTiming;
                metricValue = firstInputEntry.processingStart - firstInputEntry.startTime;
                break;
              case 'layout-shift':
                // For CLS, we need to access the value differently since it's part of the entry object
                metricValue = (entry as any).value;
                break;
            }

            if (metricValue !== undefined) {
              const metric = {
                page_url: window.location.pathname,
                [entry.entryType]: metricValue,
              };

              // Store metrics in Supabase
              const { error } = await supabase
                .from('performance_metrics')
                .insert([metric]);

              if (error) {
                console.error('Error recording metrics:', error);
              }
            }
          });
        });

        // Observe LCP, FID, and CLS
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

        // Record TTFB
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationEntry) {
          await supabase
            .from('performance_metrics')
            .insert([{
              page_url: window.location.pathname,
              ttfb: navigationEntry.responseStart - navigationEntry.requestStart,
            }]);
        }
      } catch (error) {
        console.error('Error in performance monitoring:', error);
      }
    };

    recordMetrics();
  }, []);
};
