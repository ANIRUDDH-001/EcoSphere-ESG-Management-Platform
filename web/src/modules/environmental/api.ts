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
  }
};
