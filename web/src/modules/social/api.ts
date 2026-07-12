import { supabaseClient } from '../../lib/supabaseClient';
import type { Database } from '../../types/database';

export type CsrActivity = Database['public']['Tables']['csr_activities']['Row'];
export type CsrActivityInsert = Database['public']['Tables']['csr_activities']['Insert'];
export type CsrActivityUpdate = Database['public']['Tables']['csr_activities']['Update'];
export type EmployeeParticipation = Database['public']['Tables']['employee_participations']['Row'];
export type DiversityMetric = Database['public']['Tables']['diversity_metrics']['Row'];
export type DiversityMetricInsert = Database['public']['Tables']['diversity_metrics']['Insert'];
export type TrainingCompletion = Database['public']['Tables']['training_completions']['Row'];
export type TrainingCompletionInsert = Database['public']['Tables']['training_completions']['Insert'];

// ─── CSR Activities ─────────────────────────────────────────────────────────

export async function fetchCsrActivities() {
  const { data, error } = await supabaseClient
    .from('csr_activities')
    .select(`
      *,
      category:categories(id, name),
      department:departments(id, name)
    `)
    .order('activity_date', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchCsrActivity(id: string) {
  const { data, error } = await supabaseClient
    .from('csr_activities')
    .select(`*, category:categories(id, name), department:departments(id, name)`)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function createCsrActivity(payload: CsrActivityInsert) {
  const { data, error } = await supabaseClient
    .from('csr_activities')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCsrActivity(id: string, payload: CsrActivityUpdate) {
  const { data, error } = await supabaseClient
    .from('csr_activities')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCsrActivity(id: string) {
  const { error } = await supabaseClient
    .from('csr_activities')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ─── Participation ────────────────────────────────────────────────────────────

export async function fetchMyParticipations(employeeId: string) {
  const { data, error } = await supabaseClient
    .from('employee_participations')
    .select(`
      *,
      activity:csr_activities(id, title, activity_date, points, capacity, status),
      reviewer:profiles!employee_participations_reviewed_by_fkey(id, full_name)
    `)
    .eq('employee_id', employeeId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchPendingParticipations(departmentId?: string) {
  let query = supabaseClient
    .from('employee_participations')
    .select(`
      *,
      employee:profiles!employee_participations_employee_id_fkey(id, full_name, email, department_id),
      activity:csr_activities(id, title, activity_date, points, capacity, department_id)
    `)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: false });

  if (departmentId) {
    // filter via activity department
    query = query.eq('activity.department_id', departmentId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function fetchAllParticipations() {
  const { data, error } = await supabaseClient
    .from('employee_participations')
    .select(`
      *,
      employee:profiles!employee_participations_employee_id_fkey(id, full_name, department_id),
      activity:csr_activities(id, title, activity_date, points, department_id),
      reviewer:profiles!employee_participations_reviewed_by_fkey(id, full_name)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function joinActivity(activityId: string, employeeId: string) {
  // Capacity guard: count pending + approved
  const { count, error: countErr } = await supabaseClient
    .from('employee_participations')
    .select('*', { count: 'exact', head: true })
    .eq('activity_id', activityId)
    .in('approval_status', ['pending', 'approved']);
  if (countErr) throw countErr;

  const { data: activity, error: actErr } = await supabaseClient
    .from('csr_activities')
    .select('capacity')
    .eq('id', activityId)
    .single();
  if (actErr) throw actErr;

  if (activity.capacity !== null && (count ?? 0) >= activity.capacity) {
    throw new Error('Activity is at full capacity');
  }

  const { data, error } = await supabaseClient
    .from('employee_participations')
    .insert({ activity_id: activityId, employee_id: employeeId, approval_status: 'pending', points_earned: 0 })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadProof(participationId: string, employeeId: string, file: File) {
  const ext = file.name.split('.').pop();
  const path = `${employeeId}/${participationId}.${ext}`;
  const { error: uploadErr } = await supabaseClient.storage
    .from('csr-proofs')
    .upload(path, file, { upsert: true });
  if (uploadErr) throw uploadErr;

  const { data: { publicUrl } } = supabaseClient.storage.from('csr-proofs').getPublicUrl(path);

  const { data, error } = await supabaseClient
    .from('employee_participations')
    .update({ proof_url: publicUrl })
    .eq('id', participationId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function approveParticipation(id: string, reviewerId: string) {
  const { data, error } = await supabaseClient
    .from('employee_participations')
    .update({ approval_status: 'approved', reviewed_by: reviewerId, completion_date: new Date().toISOString().split('T')[0] })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function rejectParticipation(id: string, reviewerId: string) {
  const { data, error } = await supabaseClient
    .from('employee_participations')
    .update({ approval_status: 'rejected', reviewed_by: reviewerId })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Participation summary (useParticipationSummary contract) ─────────────────

export interface ParticipationSummary {
  participationRate: number; // 0-100
  approvedCount: number;
  totalEmployees: number;
  recentByDept: { department_id: string; name: string; count: number }[];
}

export async function fetchParticipationSummary(): Promise<ParticipationSummary> {
  const [{ data: approved, error: e1 }, { data: depts, error: e2 }] = await Promise.all([
    supabaseClient
      .from('employee_participations')
      .select('employee_id, employee:profiles!employee_participations_employee_id_fkey(department_id)')
      .eq('approval_status', 'approved'),
    supabaseClient.from('departments').select('id, name, employee_count').eq('status', 'active'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const totalEmployees = (depts ?? []).reduce((s, d) => s + (d.employee_count ?? 0), 0);
  const uniqueEmployees = new Set((approved ?? []).map(p => p.employee_id)).size;
  const participationRate = totalEmployees > 0 ? Math.round((uniqueEmployees / totalEmployees) * 100) : 0;

  const byDept: Record<string, number> = {};
  for (const p of approved ?? []) {
    const deptId = (p.employee as { department_id: string } | null)?.department_id;
    if (deptId) byDept[deptId] = (byDept[deptId] ?? 0) + 1;
  }
  const recentByDept = (depts ?? []).map(d => ({ department_id: d.id, name: d.name ?? '', count: byDept[d.id] ?? 0 }))
    .sort((a, b) => b.count - a.count);

  return { participationRate, approvedCount: uniqueEmployees, totalEmployees, recentByDept };
}

export async function fetchParticipationTrend() {
  const { data, error } = await supabaseClient
    .from('employee_participations')
    .select('completion_date')
    .eq('approval_status', 'approved')
    .order('completion_date');
  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const p of data ?? []) {
    const d = p.completion_date || new Date().toISOString().split('T')[0];
    counts[d] = (counts[d] ?? 0) + 1;
  }

  return Object.keys(counts).sort().map(date => ({
    date,
    count: counts[date]
  }));
}

// ─── Diversity Metrics ────────────────────────────────────────────────────────

export async function fetchDiversityMetrics(departmentId?: string) {
  let query = supabaseClient
    .from('diversity_metrics')
    .select(`*, department:departments(id, name)`)
    .order('period', { ascending: false });
  if (departmentId) query = query.eq('department_id', departmentId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function upsertDiversityMetric(payload: DiversityMetricInsert) {
  const { data, error } = await supabaseClient
    .from('diversity_metrics')
    .upsert(payload, { onConflict: 'department_id,period' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDiversityMetric(id: string) {
  const { error } = await supabaseClient.from('diversity_metrics').delete().eq('id', id);
  if (error) throw error;
}

// ─── Training Completions ─────────────────────────────────────────────────────

export async function fetchTrainingCompletions(departmentId?: string) {
  let query = supabaseClient
    .from('training_completions')
    .select(`*, employee:profiles!training_completions_employee_id_fkey(id, full_name, department_id)`)
    .order('completed_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;

  if (departmentId) {
    return (data ?? []).filter(t => (t.employee as { department_id: string } | null)?.department_id === departmentId);
  }
  return data ?? [];
}

export async function createTrainingCompletion(payload: TrainingCompletionInsert) {
  const { data, error } = await supabaseClient
    .from('training_completions')
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTrainingCompletion(id: string, payload: Partial<TrainingCompletionInsert>) {
  const { data, error } = await supabaseClient
    .from('training_completions')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTrainingCompletion(id: string) {
  const { error } = await supabaseClient.from('training_completions').delete().eq('id', id);
  if (error) throw error;
}

// ─── Categories (CSR type only) ───────────────────────────────────────────────

export async function fetchCsrCategories() {
  const { data, error } = await supabaseClient
    .from('categories')
    .select('id, name')
    .eq('type', 'csr_activity')
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return data;
}

// ─── Departments ──────────────────────────────────────────────────────────────

export async function fetchDepartments() {
  const { data, error } = await supabaseClient
    .from('departments')
    .select('id, name, employee_count')
    .eq('status', 'active')
    .order('name');
  if (error) throw error;
  return data;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────

export async function fetchProfiles() {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('id, full_name, email, role, department_id')
    .order('full_name');
  if (error) throw error;
  return data;
}

// ─── ESG Settings (for evidence toggle) ──────────────────────────────────────

export async function fetchEsgSettings() {
  const { data, error } = await supabaseClient
    .from('esg_settings')
    .select('evidence_required_enabled')
    .eq('id', 1)
    .single();
  if (error) throw error;
  return data;
}
