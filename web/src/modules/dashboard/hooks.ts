import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../../lib/supabaseClient';

export function useDashboardData() {
  const orgScoreQuery = useQuery({
    queryKey: ['org_score'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('org_score_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      if (!data) return { overall: 0, environmental: 0, social: 0, governance: 0 };
      return {
        overall: Number(data.overall_esg),
        environmental: Number(data.environmental),
        social: Number(data.social),
        governance: Number(data.governance)
      };
    }
  });

  const deptScoresQuery = useQuery({
    queryKey: ['department_scores'],
    queryFn: async () => {
      const { data, error } = await supabaseClient.from('department_scores').select('*');
      if (error) throw error;
      return data ?? [];
    }
  });

  const trendQuery = useQuery({
    queryKey: ['score_trend', 30],
    queryFn: async () => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const pastDate = d.toISOString().split('T')[0];
      const { data, error } = await supabaseClient
        .from('org_score_snapshots')
        .select('*')
        .gte('snapshot_date', pastDate)
        .order('snapshot_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    }
  });

  return {
    orgScore: orgScoreQuery.data,
    deptScores: deptScoresQuery.data ?? [],
    trend: trendQuery.data ?? [],
    isLoading: orgScoreQuery.isLoading || deptScoresQuery.isLoading || trendQuery.isLoading,
    isError: orgScoreQuery.isError || deptScoresQuery.isError
  };
}

