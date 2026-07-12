import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabaseClient } from '../supabaseClient';
import type { Database } from '../../types/database';

export type SettingsRow = Database['public']['Tables']['esg_settings']['Row'];

export function useSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['esg_settings'],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('esg_settings')
        .select('*')
        .eq('id', 1)
        .single();
      
      if (error) throw error;
      return data as SettingsRow;
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<SettingsRow>) => {
      const { data, error } = await supabaseClient
        .from('esg_settings')
        .update(updates)
        .eq('id', 1)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['esg_settings'] });
    }
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateSettings: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending
  };
}
