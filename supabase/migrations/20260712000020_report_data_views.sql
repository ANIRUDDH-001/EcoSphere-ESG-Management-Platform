-- Migration 20260712000020_report_data_views.sql
-- Create parameterized report functions for Environmental, Social, Governance, and ESG Summary

-- 1. Environmental Report Function
CREATE OR REPLACE FUNCTION public.fn_report_environmental(
  p_department_id uuid DEFAULT NULL,
  p_from_date date DEFAULT NULL,
  p_to_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_co2e numeric := 0;
  v_total_qty numeric := 0;
  v_source_breakdown jsonb;
  v_transactions jsonb;
BEGIN
  -- Aggregate total co2e and quantity
  SELECT COALESCE(SUM(co2e), 0), COALESCE(SUM(quantity), 0)
  INTO v_total_co2e, v_total_qty
  FROM public.carbon_transactions
  WHERE (p_department_id IS NULL OR department_id = p_department_id)
    AND (p_from_date IS NULL OR date >= p_from_date)
    AND (p_to_date IS NULL OR date <= p_to_date);

  -- Source Breakdown
  SELECT COALESCE(jsonb_agg(sub), '[]'::jsonb)
  INTO v_source_breakdown
  FROM (
    SELECT source_type, COALESCE(SUM(co2e), 0) as co2e, COALESCE(SUM(quantity), 0) as quantity
    FROM public.carbon_transactions
    WHERE (p_department_id IS NULL OR department_id = p_department_id)
      AND (p_from_date IS NULL OR date >= p_from_date)
      AND (p_to_date IS NULL OR date <= p_to_date)
    GROUP BY source_type
  ) sub;

  -- Transactions details
  SELECT COALESCE(jsonb_agg(t), '[]'::jsonb)
  INTO v_transactions
  FROM (
    SELECT id, date, source_type, source_ref, quantity, co2e, note
    FROM public.carbon_transactions
    WHERE (p_department_id IS NULL OR department_id = p_department_id)
      AND (p_from_date IS NULL OR date >= p_from_date)
      AND (p_to_date IS NULL OR date <= p_to_date)
    ORDER BY date DESC
    LIMIT 100
  ) t;

  RETURN jsonb_build_object(
    'total_co2e', v_total_co2e,
    'total_quantity', v_total_qty,
    'source_breakdown', v_source_breakdown,
    'transactions', v_transactions
  );
END;
$$;

-- 2. Social Report Function
CREATE OR REPLACE FUNCTION public.fn_report_social(
  p_department_id uuid DEFAULT NULL,
  p_from_date date DEFAULT NULL,
  p_to_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_csr_count int := 0;
  v_participation_count int := 0;
  v_total_points int := 0;
  v_avg_completion numeric := 0;
  v_diversity jsonb;
BEGIN
  -- CSR activities count
  SELECT COUNT(*), COALESCE(SUM(points), 0)
  INTO v_csr_count, v_total_points
  FROM public.csr_activities
  WHERE (p_department_id IS NULL OR department_id = p_department_id)
    AND (p_from_date IS NULL OR activity_date >= p_from_date)
    AND (p_to_date IS NULL OR activity_date <= p_to_date);

  -- Participations
  SELECT COUNT(*), COALESCE(AVG(completion_pct), 0)
  INTO v_participation_count, v_avg_completion
  FROM public.training_completions tc
  JOIN public.profiles p ON tc.employee_id = p.id
  WHERE (p_department_id IS NULL OR p.department_id = p_department_id)
    AND (p_from_date IS NULL OR tc.completed_at >= p_from_date)
    AND (p_to_date IS NULL OR tc.completed_at <= p_to_date);

  -- Diversity metrics (select latest/average)
  SELECT jsonb_build_object(
    'gender_ratio', COALESCE(AVG(gender_ratio), 0),
    'avg_tenure', COALESCE(AVG(avg_tenure), 0),
    'training_hours', COALESCE(SUM(training_hours), 0),
    'headcount', COALESCE(SUM(headcount), 0)
  ) INTO v_diversity
  FROM public.diversity_metrics
  WHERE (p_department_id IS NULL OR department_id = p_department_id);

  RETURN jsonb_build_object(
    'csr_activities_count', v_csr_count,
    'total_participations', v_participation_count,
    'total_points_earned', v_total_points,
    'avg_completion_pct', v_avg_completion,
    'diversity', v_diversity
  );
END;
$$;

-- 3. Governance Report Function
CREATE OR REPLACE FUNCTION public.fn_report_governance(
  p_department_id uuid DEFAULT NULL,
  p_from_date date DEFAULT NULL,
  p_to_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_issues_count int := 0;
  v_open_count int := 0;
  v_resolved_count int := 0;
  v_audits_count int := 0;
  v_audits_pass_count int := 0;
  v_issues jsonb;
BEGIN
  -- Compliance Issues counts
  SELECT 
    COUNT(*), 
    COUNT(CASE WHEN status IN ('open', 'in_progress') THEN 1 END),
    COUNT(CASE WHEN status = 'resolved' THEN 1 END)
  INTO v_issues_count, v_open_count, v_resolved_count
  FROM public.compliance_issues ci
  LEFT JOIN public.audits a ON ci.audit_id = a.id
  WHERE (p_department_id IS NULL OR a.department_id = p_department_id)
    AND (p_from_date IS NULL OR ci.created_at >= p_from_date)
    AND (p_to_date IS NULL OR ci.created_at <= p_to_date);

  -- Audits counts
  SELECT COUNT(*), COUNT(CASE WHEN result = 'pass' THEN 1 END)
  INTO v_audits_count, v_audits_pass_count
  FROM public.audits
  WHERE (p_department_id IS NULL OR department_id = p_department_id)
    AND (p_from_date IS NULL OR completed_date >= p_from_date)
    AND (p_to_date IS NULL OR completed_date <= p_to_date);

  -- Issues detail list
  SELECT COALESCE(jsonb_agg(i), '[]'::jsonb)
  INTO v_issues
  FROM (
    SELECT ci.id, ci.severity, ci.description, ci.status, ci.created_at
    FROM public.compliance_issues ci
    LEFT JOIN public.audits a ON ci.audit_id = a.id
    WHERE (p_department_id IS NULL OR a.department_id = p_department_id)
      AND (p_from_date IS NULL OR ci.created_at >= p_from_date)
      AND (p_to_date IS NULL OR ci.created_at <= p_to_date)
    ORDER BY ci.created_at DESC
    LIMIT 100
  ) i;

  RETURN jsonb_build_object(
    'compliance_issues_count', v_issues_count,
    'open_issues_count', v_open_count,
    'resolved_issues_count', v_resolved_count,
    'audits_count', v_audits_count,
    'audits_pass_count', v_audits_pass_count,
    'issues', v_issues
  );
END;
$$;

-- 4. ESG Summary Report Function
CREATE OR REPLACE FUNCTION public.fn_report_esg_summary(
  p_department_id uuid DEFAULT NULL,
  p_from_date date DEFAULT NULL,
  p_to_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_env_score numeric := 0;
  v_soc_score numeric := 0;
  v_gov_score numeric := 0;
  v_total_score numeric := 0;
  v_env_weight numeric;
  v_soc_weight numeric;
  v_gov_weight numeric;
  v_department_scores jsonb;
BEGIN
  -- Read weights from settings
  SELECT env_weight, social_weight, gov_weight
  INTO v_env_weight, v_soc_weight, v_gov_weight
  FROM public.esg_settings
  WHERE id = 1;

  -- Get scores
  IF p_department_id IS NOT NULL THEN
    SELECT environmental_score, social_score, governance_score, total_score
    INTO v_env_score, v_soc_score, v_gov_score, v_total_score
    FROM public.department_scores
    WHERE department_id = p_department_id;
  ELSE
    -- Organization average
    SELECT 
      AVG(environmental_score), 
      AVG(social_score), 
      AVG(governance_score), 
      AVG(total_score)
    INTO v_env_score, v_soc_score, v_gov_score, v_total_score
    FROM public.department_scores;
  END IF;

  -- Department scores breakdown
  SELECT COALESCE(jsonb_agg(ds), '[]'::jsonb)
  INTO v_department_scores
  FROM (
    SELECT d.name, ds.environmental_score, ds.social_score, ds.governance_score, ds.total_score
    FROM public.department_scores ds
    JOIN public.departments d ON ds.department_id = d.id
  ) ds;

  RETURN jsonb_build_object(
    'environmental_score', COALESCE(v_env_score, 0),
    'social_score', COALESCE(v_soc_score, 0),
    'governance_score', COALESCE(v_gov_score, 0),
    'total_score', COALESCE(v_total_score, 0),
    'weight_environmental', COALESCE(v_env_weight, 0.4),
    'weight_social', COALESCE(v_soc_weight, 0.3),
    'weight_governance', COALESCE(v_gov_weight, 0.3),
    'department_scores', v_department_scores
  );
END;
$$;
