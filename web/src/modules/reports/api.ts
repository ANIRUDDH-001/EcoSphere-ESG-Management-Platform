import { supabaseClient } from '@/lib/supabaseClient';

export interface ReportFilters {
  departmentId?: string;
  fromDate?: string;
  toDate?: string;
}

export async function fetchDepartments() {
  const { data, error } = await supabaseClient
    .from('departments')
    .select('id, name')
    .eq('status', 'active');
  if (error) throw error;
  return data;
}

export async function fetchEnvironmentalReport(filters: ReportFilters) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseClient as any).rpc('fn_report_environmental', {
    p_department_id: filters.departmentId || null,
    p_from_date: filters.fromDate || null,
    p_to_date: filters.toDate || null
  });
  if (error) throw error;
  return data as any;
}

export async function fetchSocialReport(filters: ReportFilters) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseClient as any).rpc('fn_report_social', {
    p_department_id: filters.departmentId || null,
    p_from_date: filters.fromDate || null,
    p_to_date: filters.toDate || null
  });
  if (error) throw error;
  return data as any;
}

export async function fetchGovernanceReport(filters: ReportFilters) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseClient as any).rpc('fn_report_governance', {
    p_department_id: filters.departmentId || null,
    p_from_date: filters.fromDate || null,
    p_to_date: filters.toDate || null
  });
  if (error) throw error;
  return data as any;
}

export async function fetchEsgSummaryReport(filters: ReportFilters) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabaseClient as any).rpc('fn_report_esg_summary', {
    p_department_id: filters.departmentId || null,
    p_from_date: filters.fromDate || null,
    p_to_date: filters.toDate || null
  });
  if (error) throw error;
  return data as any;
}

// AI Summary Endpoint (Contract: a4_07)
export interface ReportSummaryPayload {
  title: string;
  period: string;
  metrics: Record<string, number | string>;
  highlights?: string[];
}

export interface ReportSummaryResponse {
  summary: string;
  cached: boolean;
  fallback: boolean;
}

export async function postReportSummary(payload: ReportSummaryPayload): Promise<ReportSummaryResponse> {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const token = session?.access_token;

  // Contact Track A API endpoint
  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/report-summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    // If the backend returns error (or Track A isn't merged and Hono returns 404/500), 
    // we should return a default fallback response gracefully.
    return {
      summary: `Fallback Summary: Calculated ESG summary for ${payload.title}. Period: ${payload.period}. Selected metrics: ${JSON.stringify(payload.metrics)}`,
      cached: false,
      fallback: true
    };
  }

  return res.json();
}
