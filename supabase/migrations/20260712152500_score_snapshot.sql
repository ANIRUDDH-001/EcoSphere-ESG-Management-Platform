-- Migration: Daily Org Score Snapshot Job

-- 1. Ensure unique constraint for UPSERT
alter table public.org_score_snapshots add constraint org_score_snapshots_date_key unique (snapshot_date);

-- 2. Refactor org score function to use ON CONFLICT
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
  
  insert into public.org_score_snapshots (snapshot_date, overall_esg, environmental, social, governance)
  values (current_date, v_overall, v_env, v_soc, v_gov)
  on conflict (snapshot_date) do update
  set overall_esg = excluded.overall_esg,
      environmental = excluded.environmental,
      social = excluded.social,
      governance = excluded.governance;
end;
$$;

-- 3. Daily score job
create or replace function public.fn_daily_score_job()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_count int := 0;
begin
  -- Safety full recompute
  for r in select id from public.departments loop
    perform public.fn_recompute_department_score(r.id);
    v_count := v_count + 1;
  end loop;
  
  -- Recompute and snapshot org score
  perform public.fn_recompute_org_score();
  
  insert into public.job_runs (job_name, affected_count, ran_at)
  values ('daily_score_snapshot', v_count, now());
end;
$$;

-- 4. Schedule via pg_cron
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.schedule('daily_score_snapshot_job', '0 0 * * *', 'SELECT public.fn_daily_score_job();');
  END IF;
END
$$;
