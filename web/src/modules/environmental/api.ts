import { supabaseClient } from '../../lib/supabaseClient';
import type { Database } from '../../types/database';
import type { EmissionFactorFormValues } from './schemas';
import { computeGoalStatus } from './utils';

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
  },

  listProducts: async () => {
    const { data, error } = await supabaseClient
      .from('product_esg_profiles')
      .select(`*, emission_factors(name, factor_kgco2e, unit)`);
    if (error) throw error;
    return data;
  },

  getProduct: async (id: string) => {
    const { data, error } = await supabaseClient
      .from('product_esg_profiles')
      .select(`*, emission_factors(name, factor_kgco2e, unit)`)
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  createProduct: async (input: Database['public']['Tables']['product_esg_profiles']['Insert']) => {
    const { data, error } = await supabaseClient
      .from('product_esg_profiles')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateProduct: async (id: string, input: Database['public']['Tables']['product_esg_profiles']['Update']) => {
    const { data, error } = await supabaseClient
      .from('product_esg_profiles')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteProduct: async (id: string) => {
    const { error } = await supabaseClient
      .from('product_esg_profiles')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  listGoals: async () => {
    const { data, error } = await supabaseClient
      .from('environmental_goals')
      .select(`*, departments(name)`);
    if (error) throw error;
    return data;
  },

  createGoal: async (input: Database['public']['Tables']['environmental_goals']['Insert']) => {
    const { data, error } = await supabaseClient
      .from('environmental_goals')
      .insert(input)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateGoal: async (id: string, input: Database['public']['Tables']['environmental_goals']['Update']) => {
    const { data, error } = await supabaseClient
      .from('environmental_goals')
      .update(input)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteGoal: async (id: string) => {
    const { error } = await supabaseClient
      .from('environmental_goals')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  recomputeGoalStatus: async (id: string) => {
    const { data: goal, error: fetchError } = await supabaseClient
      .from('environmental_goals')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;

    const newStatus = computeGoalStatus({
      baseline: goal.baseline || 0,
      target: goal.target || 0,
      current_value: goal.current_value || 0,
      target_date: goal.target_date || ''
    });

    if (newStatus !== goal.status) {
      const { data, error } = await supabaseClient
        .from('environmental_goals')
        .update({ status: newStatus as any })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return goal;
  }
};
