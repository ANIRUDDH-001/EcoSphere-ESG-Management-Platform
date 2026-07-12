import { supabaseClient } from '../../lib/supabaseClient';
import type { Database } from '../../types/database';
import type { EmissionFactorFormValues } from './schemas';

type EmissionFactorRow = Database['public']['Tables']['emission_factors']['Row'];

export const environmentalApi = {
  listFactors: async (status?: string) => {
    let query = supabaseClient.from('emission_factors').select('*').order('name');
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data as EmissionFactorRow[];
  },
  
  getFactor: async (id: string) => {
    const { data, error } = await supabaseClient
      .from('emission_factors')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as EmissionFactorRow;
  },
  
  createFactor: async (input: EmissionFactorFormValues) => {
    const { data, error } = await supabaseClient
      .from('emission_factors')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data as EmissionFactorRow;
  },
  
  updateFactor: async (id: string, input: Partial<EmissionFactorFormValues>) => {
    const { data, error } = await supabaseClient
      .from('emission_factors')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as EmissionFactorRow;
  },
  
  archiveFactor: async (id: string) => {
    const { data, error } = await supabaseClient
      .from('emission_factors')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as EmissionFactorRow;
  }
};
