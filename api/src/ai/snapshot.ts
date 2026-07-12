import { SupabaseClient } from '@supabase/supabase-js';

export async function buildScoreSnapshot(db: SupabaseClient, scope: 'org' | { department_id: string }) {
  let scores = { total: 0, environmental: 0, social: 0, governance: 0 };
  let issues = 0;
  let participationRate = 0;
  let goalsCompleted = 0;

  if (scope === 'org') {
    const { data: scoreData } = await db.from('org_score_snapshots')
      .select('overall_esg, environmental, social, governance')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single();
    if (scoreData) {
      scores = {
        total: scoreData.overall_esg,
        environmental: scoreData.environmental,
        social: scoreData.social,
        governance: scoreData.governance
      };
    }
    
    const { count: issueCount } = await db.from('compliance_issues')
      .select('*', { count: 'exact', head: true })
      .eq('is_overdue', true);
    issues = issueCount || 0;

    const { data: participations } = await db.from('employee_participations').select('approval_status');
    const { count: empCount } = await db.from('profiles').select('*', { count: 'exact', head: true });
    
    participationRate = (empCount && empCount > 0) ? ((participations?.length || 0) / empCount) * 100 : 0;
    
    const { count: goalCount } = await db.from('environmental_goals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'achieved');
    goalsCompleted = goalCount || 0;
  } else {
    const deptId = scope.department_id;
    const { data: scoreData } = await db.from('department_scores')
      .select('total_score, environmental_score, social_score, governance_score')
      .eq('department_id', deptId)
      .single();
      
    if (scoreData) {
      scores = {
        total: scoreData.total_score,
        environmental: scoreData.environmental_score,
        social: scoreData.social_score,
        governance: scoreData.governance_score
      };
    }

    const { count: issueCount } = await db.from('compliance_issues')
      .select('id, profiles!inner(department_id)', { count: 'exact', head: true })
      .eq('is_overdue', true)
      .eq('profiles.department_id', deptId);
    issues = issueCount || 0;

    const { data: profs } = await db.from('profiles').select('id').eq('department_id', deptId);
    const profIds = profs?.map((p: any) => p.id) || [];
    
    if (profIds.length > 0) {
      const { count: pCount } = await db.from('employee_participations')
        .select('*', { count: 'exact', head: true })
        .in('employee_id', profIds);
      participationRate = (pCount || 0) / profIds.length * 100;
    }

    const { count: goalCount } = await db.from('environmental_goals')
      .select('*', { count: 'exact', head: true })
      .eq('department_id', deptId)
      .eq('status', 'achieved');
    goalsCompleted = goalCount || 0;
  }

  const pillars = [
    { name: 'Environmental', score: scores.environmental },
    { name: 'Social', score: scores.social },
    { name: 'Governance', score: scores.governance }
  ];
  pillars.sort((a, b) => a.score - b.score);
  const lowestPillar = pillars[0].name;

  return {
    scope: scope === 'org' ? 'Organization' : 'Department',
    scores,
    lowestPillar,
    drivers: {
      overdueIssues: issues,
      participationRate: Math.round(participationRate),
      goalsCompleted
    }
  };
}
