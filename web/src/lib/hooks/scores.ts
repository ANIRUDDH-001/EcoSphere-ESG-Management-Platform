import { useQuery } from '@tanstack/react-query';
import { supabaseClient } from '../supabaseClient';
import type { Database } from '../../types/database';

export type DepartmentScoreRow = Database['public']['Tables']['department_scores']['Row'];
export type OrgScoreSnapshot = Database['public']['Tables']['org_score_snapshots']['Row'];

export function useOrgScore() {
  const query = useQuery({
    queryKey: ['org_score'],
    queryFn: async () => {
      // Get the latest snapshot by date
      const { data, error } = await supabaseClient
        .from('org_score_snapshots')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (!data) {
        return { overall: 0, environmental: 0, social: 0, governance: 0 };
      }
      
      return {
        overall: Number(data.overall_esg),
        environmental: Number(data.environmental),
        social: Number(data.social),
        governance: Number(data.governance)
      };
    }
  });

  return { data: query.data };
}

export function useDepartmentScores() {
  const query = useQuery({
    queryKey: ['department_scores'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('department_scores')
        .select('*');
        
      if (error) throw error;
      return data as DepartmentScoreRow[];
    }
  });

  return { data: query.data };
}

export function useScoreTrend(days: number) {
  const query = useQuery({
    queryKey: ['score_trend', days],
    queryFn: async () => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      const pastDate = d.toISOString().split('T')[0];

      const { data, error } = await supabaseClient
        .from('org_score_snapshots')
        .select('*')
        .gte('snapshot_date', pastDate)
        .order('snapshot_date', { ascending: true });
        
      if (error) throw error;
      return data as OrgScoreSnapshot[];
    }
  });

  return { data: query.data };
}

export function subscribeScores(onChange: () => void): () => void {
  const channel = supabaseClient.channel('scores_realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'department_scores' },
      () => {
        onChange();
      }
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'org_score_snapshots' },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    supabaseClient.removeChannel(channel);
  };
}
