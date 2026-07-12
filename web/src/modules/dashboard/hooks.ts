import { useOrgScore, useScoreTrend } from '../../lib/hooks/scores';

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
