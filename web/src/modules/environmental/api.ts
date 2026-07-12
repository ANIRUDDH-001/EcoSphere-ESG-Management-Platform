import { supabaseClient } from '../../lib/supabaseClient';
import type { Database } from '../../types/database';
import type { EmissionFactorFormValues, CarbonTxnFormValues } from './schemas';
import { computeGoalStatus } from './utils';
import { computeCo2e } from '../../lib/emissions';

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
  },

  listCarbon: async (filter?: { department_id?: string; source_type?: string; date_from?: string; date_to?: string }) => {
    let query = supabaseClient
      .from('carbon_transactions')
      .select(`*, departments(name), emission_factors(name, unit)`)
      .order('date', { ascending: false });

    if (filter?.department_id) query = query.eq('department_id', filter.department_id);
    if (filter?.source_type) query = query.eq('source_type', filter.source_type as Database['public']['Enums']['source_type']);
    if (filter?.date_from) query = query.gte('date', filter.date_from);
    if (filter?.date_to) query = query.lte('date', filter.date_to);

    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  createCarbon: async (input: CarbonTxnFormValues) => {
    // Fetch the factor to recompute co2e server-side (source of truth)
    const { data: factor, error: factorError } = await supabaseClient
      .from('emission_factors')
      .select('factor_kgco2e')
      .eq('id', input.emission_factor_id)
      .single();
    if (factorError) throw factorError;

    const co2e = computeCo2e(input.quantity, factor.factor_kgco2e ?? 0);

    const { data, error } = await supabaseClient
      .from('carbon_transactions')
      .insert({
        ...input,
        department_id: input.department_id || null,
        co2e,
        is_auto: false,
        source_type: input.source_type as any
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteCarbon: async (id: string) => {
    const { error } = await supabaseClient
      .from('carbon_transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  getDepartmentEmissions: async () => {
    // vw_department_emissions is not in generated types; use the anon table override
    const { data, error } = await (supabaseClient as any)
      .from('vw_department_emissions')
      .select('*')
      .order('total_co2e', { ascending: false });
    if (error) throw error;
    return (data ?? []) as Array<{
      department_id: string;
      department_name: string | null;
      employee_count: number;
      total_co2e: number;
      emissions_intensity: number;
    }>;
  }
};
