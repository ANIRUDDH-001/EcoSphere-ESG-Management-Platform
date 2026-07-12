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

  myPendingAcks: async (userId: string) => {
    const { data, error } = await supabaseClient
      .from('policy_acknowledgements')
      .select('*, esg_policies(*)')
      .eq('employee_id', userId)
      .eq('status', 'pending');
    if (error) throw error;
    return data;
  },

  acknowledge: async (policyId: string, userId: string) => {
    const { data, error } = await supabaseClient
      .from('policy_acknowledgements')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString()
      })
      .eq('policy_id', policyId)
      .eq('employee_id', userId)
      .eq('status', 'pending')
      .select()
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  ackRateByPolicy: async () => {
    const { data: acks, error: ackErr } = await supabaseClient
      .from('policy_acknowledgements')
      .select('policy_id, status, esg_policies(name)');
    if (ackErr) throw ackErr;
    
    const stats: Record<string, { name: string; total: number; acked: number }> = {};
    for (const ack of acks) {
      const pid = ack.policy_id;
      if (!pid) continue;
      if (!stats[pid]) {
        stats[pid] = { name: (ack.esg_policies as any)?.name || 'Unknown', total: 0, acked: 0 };
      }
      stats[pid].total++;
      if (ack.status === 'acknowledged') stats[pid].acked++;
    }
    
    return Object.values(stats).map(s => ({
      name: s.name,
      rate: s.total > 0 ? (s.acked / s.total) * 100 : 0,
      total: s.total,
      acked: s.acked
    }));
  },

  ackRateByDepartment: async () => {
    const { data: acks, error: ackErr } = await supabaseClient
      .from('policy_acknowledgements')
      .select('status, profiles!inner(department_id, departments(name))');
    if (ackErr) throw ackErr;

    const stats: Record<string, { name: string; total: number; acked: number }> = {};
    for (const ack of acks) {
      const p = ack.profiles as any;
      const deptId = p?.department_id;
      if (!deptId) continue;
      if (!stats[deptId]) {
        stats[deptId] = { name: p?.departments?.name || 'Unknown', total: 0, acked: 0 };
      }
      stats[deptId].total++;
      if (ack.status === 'acknowledged') stats[deptId].acked++;
    }

    return Object.values(stats).map(s => ({
      name: s.name,
      rate: s.total > 0 ? (s.acked / s.total) * 100 : 0,
      total: s.total,
      acked: s.acked
    }));
  }
};
