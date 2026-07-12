-- Migration: Department Total and Organization Score Functions

create or replace function public.fn_department_total(p_dept uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_env numeric;
  v_soc numeric;
  v_gov numeric;
  v_env_w numeric;
  v_soc_w numeric;
  v_gov_w numeric;
  v_total numeric;
begin
  select coalesce(env_weight, 0.40), coalesce(social_weight, 0.30), coalesce(gov_weight, 0.30)
    into v_env_w, v_soc_w, v_gov_w
    from public.esg_settings
   where id = 1;
   
  if not found then
    v_env_w := 0.40; v_soc_w := 0.30; v_gov_w := 0.30;
  end if;

  v_env := public.fn_environmental_score(p_dept);
  v_soc := public.fn_social_score(p_dept);
  v_gov := public.fn_governance_score(p_dept);
  
  v_total := (v_env_w * v_env) + (v_soc_w * v_soc) + (v_gov_w * v_gov);
  
  return round(v_total, 2);
end;
$$;

create or replace function public.fn_recompute_department_score(p_dept uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_env numeric;
  v_soc numeric;
  v_gov numeric;
  v_total numeric;
  v_env_w numeric;
  v_soc_w numeric;
  v_gov_w numeric;
begin
  select coalesce(env_weight, 0.40), coalesce(social_weight, 0.30), coalesce(gov_weight, 0.30)
    into v_env_w, v_soc_w, v_gov_w
    from public.esg_settings
   where id = 1;
   
  if not found then
    v_env_w := 0.40; v_soc_w := 0.30; v_gov_w := 0.30;
  end if;

  v_env := public.fn_environmental_score(p_dept);
  v_soc := public.fn_social_score(p_dept);
  v_gov := public.fn_governance_score(p_dept);
  
  v_total := round((v_env_w * v_env) + (v_soc_w * v_soc) + (v_gov_w * v_gov), 2);
  
  insert into public.department_scores (department_id, environmental_score, social_score, governance_score, total_score, updated_at)
  values (p_dept, v_env, v_soc, v_gov, v_total, now())
  on conflict (department_id) do update
  set environmental_score = excluded.environmental_score,
      social_score = excluded.social_score,
      governance_score = excluded.governance_score,
      total_score = excluded.total_score,
      updated_at = excluded.updated_at;
end;
$$;

create or replace function public.fn_recompute_org_score()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_emp bigint;
  v_env numeric;
  v_soc numeric;
  v_gov numeric;
  v_overall numeric;
begin
  select coalesce(sum(d.employee_count), 0) 
    into v_total_emp 
    from public.department_scores ds
    join public.departments d on d.id = ds.department_id;
  
  if v_total_emp = 0 then
    v_env := 0; v_soc := 0; v_gov := 0; v_overall := 0;
  else
    select 
      coalesce(sum(ds.environmental_score * d.employee_count) / v_total_emp, 0),
      coalesce(sum(ds.social_score * d.employee_count) / v_total_emp, 0),
      coalesce(sum(ds.governance_score * d.employee_count) / v_total_emp, 0),
      coalesce(sum(ds.total_score * d.employee_count) / v_total_emp, 0)
    into v_env, v_soc, v_gov, v_overall
    from public.department_scores ds
    join public.departments d on d.id = ds.department_id;
  end if;
  
  v_env := round(v_env, 2);
  v_soc := round(v_soc, 2);
  v_gov := round(v_gov, 2);
  v_overall := round(v_overall, 2);
  
  update public.org_score_snapshots
     set overall_esg = v_overall,
         environmental = v_env,
         social = v_soc,
         governance = v_gov
   where snapshot_date = current_date;
   
  if not found then
    insert into public.org_score_snapshots (snapshot_date, overall_esg, environmental, social, governance)
    values (current_date, v_overall, v_env, v_soc, v_gov);
  end if;
end;
$$;
