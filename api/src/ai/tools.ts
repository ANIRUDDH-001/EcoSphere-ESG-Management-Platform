import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { logger } from '../lib/logger.js';

// ---------------------------------------------------------
// Zod Schemas
// ---------------------------------------------------------

export const GetOrgScoreSchema = z.object({});
export const GetDepartmentScoresSchema = z.object({});
export const GetEmissionsTrendSchema = z.object({
  period: z.enum(['monthly', 'quarterly'])
});
export const GetParticipationStatsSchema = z.object({
  department: z.string().optional()
});
export const GetComplianceIssuesSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional()
});
export const GetPolicyAckRateSchema = z.object({});
export const GetLeaderboardSchema = z.object({
  limit: z.number().int().min(1).max(100).default(10)
});

// ---------------------------------------------------------
// Tools
// ---------------------------------------------------------

async function measure<T>(toolName: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const res = await fn();
    logger.info({ tool_name: toolName, latency_ms: Date.now() - start }, `Tool executed`);
    return res;
  } catch (err) {
    logger.error({ tool_name: toolName, latency_ms: Date.now() - start, err }, `Tool failed`);
    throw err;
  }
}

export const copilotTools = {
  get_org_score: async (db: SupabaseClient, args: z.infer<typeof GetOrgScoreSchema>) => {
    return measure('get_org_score', async () => {
      const { data, error } = await db.from('org_score_snapshots')
        .select('overall_esg, environmental, social, governance')
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data ? {
        overall: data.overall_esg,
        environmental: data.environmental,
        social: data.social,
        governance: data.governance
      } : { overall: 0, environmental: 0, social: 0, governance: 0 };
    });
  },

  get_department_scores: async (db: SupabaseClient, args: z.infer<typeof GetDepartmentScoresSchema>) => {
    return measure('get_department_scores', async () => {
      const { data, error } = await db.from('department_scores')
        .select('department_id, departments(name), total_score, environmental_score, social_score, governance_score');
      if (error) throw error;
      return (data || []).map((row: any) => ({
        department: row.departments?.name || 'Unknown',
        total: row.total_score,
        e: row.environmental_score,
        s: row.social_score,
        g: row.governance_score
      }));
    });
  },

  get_emissions_trend: async (db: SupabaseClient, args: z.infer<typeof GetEmissionsTrendSchema>) => {
    return measure('get_emissions_trend', async () => {
      const { data, error } = await db.from('carbon_transactions')
        .select('date, co2e');
      if (error) throw error;
      
      const buckets: Record<string, number> = {};
      for (const row of (data || [])) {
        if (!row.date) continue;
        const d = new Date(row.date);
        let key = '';
        if (args.period === 'monthly') {
          key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        } else {
          const q = Math.floor(d.getUTCMonth() / 3) + 1;
          key = `${d.getUTCFullYear()}-Q${q}`;
        }
        buckets[key] = (buckets[key] || 0) + Number(row.co2e || 0);
      }
      
      return Object.entries(buckets)
        .map(([bucket, co2e]) => ({ bucket, co2e }))
        .sort((a, b) => a.bucket.localeCompare(b.bucket));
    });
  },

  get_participation_stats: async (db: SupabaseClient, args: z.infer<typeof GetParticipationStatsSchema>) => {
    return measure('get_participation_stats', async () => {
      const { data: csr } = await db.from('employee_participations').select('employee_id, approval_status');
      const { data: chal } = await db.from('challenge_participations').select('employee_id, approval_status');
      const all = [...(csr || []), ...(chal || [])];
      
      let valid = all;
      if (args.department) {
        const { data: depts } = await db.from('departments').select('id, name');
        const deptId = depts?.find((d: any) => d.name === args.department)?.id;
        if (deptId) {
           const { data: profs } = await db.from('profiles').select('id, department_id').eq('department_id', deptId);
           const allowedIds = new Set(profs?.map((p: any) => p.id));
           valid = all.filter(r => allowedIds.has(r.employee_id));
        } else {
           valid = []; // department not found
        }
      }

      const total = valid.length;
      const approved = valid.filter(r => r.approval_status === 'approved').length;
      const employees = new Set(valid.map(r => r.employee_id)).size;
      const rate = total > 0 ? (approved / total) * 100 : 0;
      return { rate, approved, employees };
    });
  },

  get_compliance_issues: async (db: SupabaseClient, args: z.infer<typeof GetComplianceIssuesSchema>) => {
    return measure('get_compliance_issues', async () => {
      let query = db.from('compliance_issues').select('id, severity, due_date, is_overdue, status');
      if (args.status) {
        query = query.eq('status', args.status);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    });
  },

  get_policy_ack_rate: async (db: SupabaseClient, args: z.infer<typeof GetPolicyAckRateSchema>) => {
    return measure('get_policy_ack_rate', async () => {
      const { data: acks, error: aErr } = await db.from('policy_acknowledgements').select('status, acknowledged_at');
      if (aErr) throw aErr;
      
      const total = acks?.length || 0;
      const acknowledged = acks?.filter((a: any) => a.status === 'acknowledged' || a.acknowledged_at).length || 0;
      const rate = total > 0 ? (acknowledged / total) * 100 : 0;
      return { rate, acknowledged, required: total };
    });
  },

  get_leaderboard: async (db: SupabaseClient, args: z.infer<typeof GetLeaderboardSchema>) => {
    return measure('get_leaderboard', async () => {
      const { data, error } = await db.from('profiles')
        .select('full_name, xp')
        .order('xp', { ascending: false })
        .limit(args.limit);
      if (error) throw error;
      return (data || []).map((r: any) => ({ name: r.full_name, xp: r.xp }));
    });
  }
} as const;

// ---------------------------------------------------------
// Gemini Tool Declarations
// ---------------------------------------------------------

export const toolDeclarations = [
  {
    name: 'get_org_score',
    description: 'Get the overall organization ESG scores and pillar breakdown',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'get_department_scores',
    description: 'Get the ESG scores broken down by department',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'get_emissions_trend',
    description: 'Get the carbon emissions trend grouped by period',
    parameters: {
      type: 'OBJECT',
      properties: {
        period: { type: 'STRING', enum: ['monthly', 'quarterly'], description: 'The grouping period' }
      },
      required: ['period']
    }
  },
  {
    name: 'get_participation_stats',
    description: 'Get CSR/Challenge participation statistics optionally filtered by department',
    parameters: {
      type: 'OBJECT',
      properties: {
        department: { type: 'STRING', description: 'Department name' }
      }
    }
  },
  {
    name: 'get_compliance_issues',
    description: 'Get compliance issues optionally filtered by status',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: { type: 'STRING', enum: ['open', 'in_progress', 'resolved', 'closed'], description: 'Issue status' }
      }
    }
  },
  {
    name: 'get_policy_ack_rate',
    description: 'Get the organization policy acknowledgement rate',
    parameters: { type: 'OBJECT', properties: {} }
  },
  {
    name: 'get_leaderboard',
    description: 'Get the gamification leaderboard',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: { type: 'INTEGER', description: 'Number of results to return (default 10)' }
      }
    }
  }
];
