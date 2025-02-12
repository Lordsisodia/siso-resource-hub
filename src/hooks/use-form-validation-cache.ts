import { useRef, useCallback } from 'react';
import { z } from 'zod';
import { performanceMonitor } from '@/services/optimized-performance-monitor';

interface ValidationCacheOptions {
  maxAge?: number; // Maximum age of cache entries in milliseconds
  maxSize?: number; // Maximum number of cache entries
}

interface CacheEntry<T = any> {
  value: T;
  schema: z.ZodType<any>;
  timestamp: number;
  isValid: boolean;
  error?: string;
}

interface ValidationCache {
  validateWithCache: <T>(field: keyof T, value: any, schema: z.ZodType<T>) => Promise<boolean>;
  invalidateField: (field: string) => void;
  invalidateAll: () => void;
  clear: () => void;
}

export function useValidationCache(options: ValidationCacheOptions = {}): ValidationCache {
  const {
    maxAge = 5000, // 5 seconds default
    maxSize = 100 // 100 entries default
  } = options;

  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const pruneCache = useCallback(() => {
    const now = Date.now();
    const cache = cacheRef.current;

    // Remove expired entries
    for (const [key, entry] of cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        cache.delete(key);
      }
    }

    // Remove oldest entries if cache is too large
    if (cache.size > maxSize) {
      const entriesToDelete = cache.size - maxSize;
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < entriesToDelete; i++) {
        cache.delete(entries[i][0]);
      }
    }
  }, [maxAge, maxSize]);

  const getCacheKey = useCallback(<T>(field: keyof T, value: any): string => {
    return `${String(field)}:${JSON.stringify(value)}`;
  }, []);

  const validateWithCache = useCallback(async <T>(
    field: keyof T,
    value: any,
    schema: z.ZodType<T>
  ): Promise<boolean> => {
    const cache = cacheRef.current;
    const cacheKey = getCacheKey(field, value);
    const now = Date.now();

    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (
      cachedResult &&
      now - cachedResult.timestamp <= maxAge &&
      cachedResult.schema === schema
    ) {
      performanceMonitor.addMetric({
        id: 'validation-cache-hit',
        type: 'event',
        duration: 0,
        metadata: {
          field: String(field),
          cached: true
        }
      });

      return cachedResult.isValid;
    }

    // Validate if not in cache or expired
    try {
      const startTime = performance.now();
      await schema.parseAsync({ [field]: value });
      const duration = performance.now() - startTime;

      // Cache successful validation
      cache.set(cacheKey, {
        value,
        schema,
        timestamp: now,
        isValid: true
      });

      performanceMonitor.addMetric({
        id: 'validation-cache-miss',
        type: 'event',
        duration,
        metadata: {
          field: String(field),
          cached: false
        }
      });

      pruneCache();
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors[0]?.message;

        // Cache failed validation
        cache.set(cacheKey, {
          value,
          schema,
          timestamp: now,
          isValid: false,
          error: errorMessage
        });

        pruneCache();
      }
      return false;
    }
  }, [getCacheKey, maxAge, pruneCache]);

  const invalidateField = useCallback((field: string) => {
    const cache = cacheRef.current;
    const keysToDelete = Array.from(cache.keys()).filter(key => 
      key.startsWith(`${field}:`)
    );
    
    keysToDelete.forEach(key => cache.delete(key));
  }, []);

  const invalidateAll = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    validateWithCache,
    invalidateField,
    invalidateAll,
    clear
  };
} 