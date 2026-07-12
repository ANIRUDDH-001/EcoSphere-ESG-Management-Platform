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
  },

  listAudits: async () => {
    const { data, error } = await supabaseClient
      .from('audits')
      .select('*, profiles!auditor_id(full_name), departments(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  createAudit: async (audit: any) => {
    const { data, error } = await supabaseClient
      .from('audits')
      .insert({ ...audit, status: 'open' })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateAudit: async (id: string, audit: any) => {
    const { data, error } = await supabaseClient
      .from('audits')
      .update(audit)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  completeAudit: async (id: string, completionData: { result: string; findings?: string; completed_date: string }) => {
    const { data, error } = await supabaseClient
      .from('audits')
      .update({
        status: 'completed',
        result: completionData.result as any,
        findings: completionData.findings,
        completed_date: completionData.completed_date
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return data;
  },

  listIssues: async (filter?: { status?: string; severity?: string; is_overdue?: boolean }) => {
    let q = supabaseClient.from('compliance_issues').select(`
      *,
      profiles:owner_id (full_name),
      audits:audit_id (title)
    `).order('created_at', { ascending: false });

    if (filter?.status && filter.status !== 'all') {
      q = q.eq('status', filter.status as any);
    }
    if (filter?.severity && filter.severity !== 'all') {
      q = q.eq('severity', filter.severity as any);
    }
    if (filter?.is_overdue !== undefined) {
      q = q.eq('is_overdue', filter.is_overdue);
    }

    const { data, error } = await q;
    if (error) throw error;
    return data;
  },

  getIssue: async (id: string) => {
    const { data, error } = await supabaseClient
      .from('compliance_issues')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  createIssue: async (issue: any) => {
    const { data, error } = await supabaseClient
      .from('compliance_issues')
      .insert({ ...issue, status: 'open' })
      .select()
      .single();
    
    if (error) throw error;
    
    // notify owner
    if (data.owner_id) {
      await supabaseClient.rpc('create_notification', {
        p_user: data.owner_id,
        p_type: 'compliance_issue',
        p_title: `New compliance issue assigned`,
        p_body: `You have been assigned a new ${data.severity} severity compliance issue.`,
        p_payload: { issue_id: data.id }
      });
    }

    return data;
  },

  updateIssueStatus: async (id: string, status: string, currentStatus: string) => {
    const { ISSUE_TRANSITIONS } = await import('./schemas');
    const allowed = ISSUE_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(status)) {
      throw new Error(`Illegal transition from ${currentStatus} to ${status}`);
    }

    const { data, error } = await supabaseClient
      .from('compliance_issues')
      .update({ status: status as any })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  getDashboardStats: async () => {
    // 1. Acknowledgement Rate
    const { data: acks, error: ackErr } = await supabaseClient
      .from('policy_acknowledgements')
      .select('status');
    if (ackErr) throw ackErr;
    const totalAcks = acks.length;
    const completedAcks = acks.filter(a => a.status === 'acknowledged').length;
    const ackRate = totalAcks > 0 ? (completedAcks / totalAcks) * 100 : 100;

    // 2. Audit Pass Rate
    const { data: audits, error: auditErr } = await supabaseClient
      .from('audits')
      .select('result')
      .eq('status', 'completed');
    if (auditErr) throw auditErr;
    const totalAudits = audits.length;
    const passedAudits = audits.filter(a => a.result === 'pass').length;
    const passRate = totalAudits > 0 ? (passedAudits / totalAudits) * 100 : 100;

    // 3. Issues Stats
    const { data: issues, error: issuesErr } = await supabaseClient
      .from('compliance_issues')
      .select('*');
    if (issuesErr) throw issuesErr;
    
    const openIssues = issues.filter(i => i.status === 'open');
    const overdueCount = openIssues.filter(i => i.is_overdue).length;
    const openCount = openIssues.length;
    
    const severityBreakdown = {
      low: openIssues.filter(i => i.severity === 'low').length,
      medium: openIssues.filter(i => i.severity === 'medium').length,
      high: openIssues.filter(i => i.severity === 'high').length,
      critical: openIssues.filter(i => i.severity === 'critical').length,
    };

    const topOverdueIssues = openIssues
      .filter(i => i.is_overdue)
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .slice(0, 5);

    return {
      ackRate,
      passRate,
      openCount,
      overdueCount,
      severityBreakdown,
      topOverdueIssues
    };
  }
};
