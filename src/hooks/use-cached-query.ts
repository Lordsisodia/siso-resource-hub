import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { measureExecutionTime } from '@/utils/performance';

export function useCachedQuery<
  TQueryFnData = unknown,
  TError = unknown,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  queryKey: TQueryKey,
  queryFn: () => Promise<TQueryFnData>,
  options?: Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<TQueryFnData, TError, TData, TQueryKey>({
    queryKey,
    queryFn: async () => {
      return await measureExecutionTime(
        async () => await queryFn(),
        `query-${queryKey.join('-')}`
      );
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: 'always',
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });
}

// Example usage:
// const { data, isLoading, error } = useCachedQuery(
//   ['user', userId],
//   () => fetchUserData(userId),
//   { enabled: !!userId }
// ); 