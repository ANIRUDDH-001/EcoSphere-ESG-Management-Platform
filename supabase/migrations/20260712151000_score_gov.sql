-- Migration: Governance Score Function
-- Implements fn_governance_score(p_dept uuid) returning numeric

create or replace function public.fn_governance_score(p_dept uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ack_rate numeric;
  v_expected_acks int;
  v_completed_acks int;
  v_pass_rate numeric;
  v_completed_audits int;
  v_passed_audits int;
  v_open_issues int;
  v_overdue_issues int;
  v_gov_score numeric;
begin
  -- 1. Policy Acknowledgement Rate
  select count(*) into v_expected_acks
    from public.policy_acknowledgements pa
    join public.profiles p on p.id = pa.employee_id
   where p.department_id = p_dept;
   
  if v_expected_acks = 0 then
    v_ack_rate := 100;
  else
    select count(*) into v_completed_acks
      from public.policy_acknowledgements pa
      join public.profiles p on p.id = pa.employee_id
     where p.department_id = p_dept
       and (pa.status = 'acknowledged' or pa.acknowledged_at is not null);
    
    v_ack_rate := (v_completed_acks::numeric / v_expected_acks) * 100.0;
  end if;
  
  -- 2. Audit Pass Rate
  select count(*) into v_completed_audits
    from public.audits
   where department_id = p_dept
     and status = 'completed'
     and result is not null;
     
  if v_completed_audits = 0 then
    v_pass_rate := 100;
  else
    select count(*) into v_passed_audits
      from public.audits
     where department_id = p_dept
       and status = 'completed'
       and result = 'pass';
       
    v_pass_rate := (v_passed_audits::numeric / v_completed_audits) * 100.0;
  end if;
  
  -- 3. Compliance Issues Penalties
  -- We attribute issues to the department of the audit they belong to.
  -- open_issues: open and NOT overdue
  -- overdue_issues: open and overdue
  select 
    count(case when ci.status = 'open' and not (coalesce(ci.is_overdue, false) or coalesce(ci.due_date < current_date, false)) then 1 end),
    count(case when ci.status = 'open' and (coalesce(ci.is_overdue, false) or coalesce(ci.due_date < current_date, false)) then 1 end)
  into v_open_issues, v_overdue_issues
  from public.compliance_issues ci
  join public.audits a on a.id = ci.audit_id
  where a.department_id = p_dept;
  
  -- 4. Calculate Score
  v_gov_score := (0.5 * v_ack_rate) + (0.5 * v_pass_rate) - (5 * v_open_issues) - (10 * v_overdue_issues);
  v_gov_score := least(greatest(v_gov_score, 0), 100);
  
  return round(v_gov_score, 2);
end;
$$;
