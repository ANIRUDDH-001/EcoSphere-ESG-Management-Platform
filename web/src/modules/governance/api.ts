// Governance module API (a2_01+)
import { supabaseClient } from '../../lib/supabaseClient';
import type { Database } from '../../types/database';
import type { PolicyFormValues } from './schemas';

type PolicyRow = Database['public']['Tables']['esg_policies']['Row'];

export const governanceApi = {
  listPolicies: async (filter?: { status?: string }) => {
    let query = supabaseClient.from('esg_policies').select(`*, profiles:owner_id(full_name)`).order('created_at', { ascending: false });
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  getPolicy: async (id: string) => {
    const { data, error } = await supabaseClient
      .from('esg_policies')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data as PolicyRow;
  },

  createPolicy: async (input: PolicyFormValues) => {
    const { data, error } = await supabaseClient
      .from('esg_policies')
      .insert(input as Database['public']['Tables']['esg_policies']['Insert'])
      .select()
      .single();
    if (error) throw error;
    return data as PolicyRow;
  },

  updatePolicy: async (id: string, input: Partial<PolicyFormValues>) => {
    const { data, error } = await supabaseClient
      .from('esg_policies')
      .update(input as Database['public']['Tables']['esg_policies']['Update'])
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as PolicyRow;
  },

  archivePolicy: async (id: string) => {
    const { data, error } = await supabaseClient
      .from('esg_policies')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data as PolicyRow;
  },

  listAudits: async () => {
    // Stub
    return [];
  },

  listIssues: async () => {
    // Stub
    return [];
  },

  listAcknowledgements: async () => {
    // Stub
    return [];
  }
};
