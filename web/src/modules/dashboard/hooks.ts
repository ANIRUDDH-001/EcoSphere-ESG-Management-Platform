import { useQuery } from '@tanstack/react-query';
import { useOrgScore, useScoreTrend } from '../../lib/hooks/scores';
import { postInsights } from './api';

export function useInsights() {
  return useQuery({
    queryKey: ['insights', 'org'],
    queryFn: () => postInsights('org'),
    staleTime: 5 * 60 * 1000,
  });
}
export function useDashboardData() {
  const { data: orgScore } = useOrgScore();
  const { data: trend } = useScoreTrend(30);

  // If data is undefined, it is loading
  const isLoading = orgScore === undefined || trend === undefined;

  // Errors from these hooks are thrown and caught by ErrorBoundaries
  const isError = false; 

  return {
    orgScore,
    trend: trend ?? [],
    isLoading,
    isError
  };
}
