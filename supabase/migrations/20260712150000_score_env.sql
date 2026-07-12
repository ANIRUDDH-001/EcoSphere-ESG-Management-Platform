-- Migration: Environmental Score Function
-- Implements fn_environmental_score(p_dept uuid) returning numeric

create or replace function public.fn_environmental_score(p_dept uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal_achievement_pct numeric;
  v_emissions_efficiency numeric;
  v_current_intensity numeric;
  v_baseline_intensity numeric;
  v_total_org_co2e numeric;
  v_total_org_emp bigint;
  v_dept_co2e numeric;
  v_dept_emp bigint;
  v_env_score numeric;
  v_goal_count int;
begin
  -- 1. Goal achievement
  -- avg over dept goals of clamp(progress,0,100)
  -- progress = clamp(100 * (baseline - current_value) / nullif(baseline - target,0), 0, 100)
  select avg(
           least(greatest( 100.0 * (baseline - current_value) / nullif(baseline - target, 0), 0), 100)
         ), count(*)
    into v_goal_achievement_pct, v_goal_count
    from public.environmental_goals
   where department_id = p_dept
     and status in ('active', 'achieved');
     
  if v_goal_count = 0 or v_goal_achievement_pct is null then
    v_goal_achievement_pct := 70;
  end if;
  
  -- 2. Emissions efficiency
  -- Org baseline intensity from vw_department_emissions (rolling 12 months)
  select sum(total_co2e), sum(employee_count)
    into v_total_org_co2e, v_total_org_emp
    from public.vw_department_emissions;
    
  if coalesce(v_total_org_emp, 0) > 0 then
    v_baseline_intensity := coalesce(v_total_org_co2e, 0) / v_total_org_emp::numeric;
  else
    v_baseline_intensity := 0;
  end if;
  
  -- Dept current intensity
  select total_co2e, employee_count, emissions_intensity
    into v_dept_co2e, v_dept_emp, v_current_intensity
    from public.vw_department_emissions
   where department_id = p_dept;
   
  if not found or coalesce(v_current_intensity, 0) = 0 or coalesce(v_baseline_intensity, 0) = 0 then
    v_emissions_efficiency := 70;
  else
    v_emissions_efficiency := coalesce(
      least(greatest( 100.0 * v_baseline_intensity / nullif(v_current_intensity, 0), 0), 100),
      70
    );
  end if;
  
  -- 3. Blend and round
  v_env_score := (0.6 * v_goal_achievement_pct) + (0.4 * v_emissions_efficiency);
  
  return round(v_env_score, 2);
end;
$$;
