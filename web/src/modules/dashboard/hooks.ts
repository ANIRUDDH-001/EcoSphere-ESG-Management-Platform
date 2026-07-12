import { useOrgScore, useDepartmentScores, useScoreTrend } from '../../lib/hooks/scores';

export function useDashboardData() {
  const { data: orgScore } = useOrgScore();
  const { data: deptScores } = useDepartmentScores();
  const { data: trend } = useScoreTrend(30);

  // If data is undefined, it is loading
  const isLoading = orgScore === undefined || deptScores === undefined || trend === undefined;

  // Errors from these hooks are thrown and caught by ErrorBoundaries
  const isError = false; 

  return {
    orgScore,
    deptScores: deptScores ?? [],
    trend: trend ?? [],
    isLoading,
    isError
  };
}
