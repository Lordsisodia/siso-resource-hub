import { QueryClient } from '@tanstack/react-query';
import { measureExecutionTime } from '@/utils/performance';

// Create a performance-optimized query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global query configuration
      staleTime: 1000 * 60 * 5, // Data stays fresh for 5 minutes
      cacheTime: 1000 * 60 * 30, // Cache persists for 30 minutes
      refetchOnWindowFocus: false, // Don't refetch on window focus
      refetchOnReconnect: 'always', // Always refetch on reconnect
      retry: 2, // Retry failed requests twice
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Measure query performance
      queryFn: async (context) => {
        const originalFn = context.queryFn;
        if (!originalFn) throw new Error('Query function is required');
        
        return await measureExecutionTime(
          async () => await originalFn(context),
          `query-${context.queryKey.join('-')}`
        );
      },
    },
    mutations: {
      // Global mutation configuration
      retry: 1,
      retryDelay: 1000,
      
      // Measure mutation performance
      mutationFn: async (context) => {
        const originalFn = context.mutationFn;
        if (!originalFn) throw new Error('Mutation function is required');
        
        return await measureExecutionTime(
          async () => await originalFn(context),
          `mutation-${context.mutationKey?.join('-') || 'anonymous'}`
        );
      },
    },
  },
}); 