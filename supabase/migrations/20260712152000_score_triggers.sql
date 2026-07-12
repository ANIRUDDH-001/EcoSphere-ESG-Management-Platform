-- Migration: Score Recompute Triggers

-- 1. Helper function for tables with department_id directly
create or replace function public.fn_trg_recompute_dept() returns trigger
language plpgsql
security definer
as $$
declare
  v_dept uuid;
begin
  if TG_OP = 'DELETE' then
    v_dept := OLD.department_id;
  else
    v_dept := NEW.department_id;
  end if;
  
  if v_dept is not null then
    raise notice 'recomputed dept % total %', v_dept, TG_TABLE_NAME;
    perform public.fn_recompute_department_score(v_dept);
    perform public.fn_recompute_org_score();
  end if;
  
  return coalesce(NEW, OLD);
end;
$$;

-- 2. Helper function for tables with employee_id (lookup profiles)
create or replace function public.fn_trg_recompute_emp() returns trigger
language plpgsql
security definer
as $$
declare
  v_emp uuid;
  v_dept uuid;
begin
  if TG_OP = 'DELETE' then
    v_emp := OLD.employee_id;
  else
    v_emp := NEW.employee_id;
  end if;
  
  select department_id into v_dept from public.profiles where id = v_emp;
  
  if v_dept is not null then
    raise notice 'recomputed dept % total %', v_dept, TG_TABLE_NAME;
    perform public.fn_recompute_department_score(v_dept);
    perform public.fn_recompute_org_score();
  end if;
  
  return coalesce(NEW, OLD);
end;
$$;

-- 3. Helper function for compliance_issues (lookup audits)
create or replace function public.fn_trg_recompute_issue() returns trigger
language plpgsql
security definer
as $$
declare
  v_audit uuid;
  v_dept uuid;
begin
  if TG_OP = 'DELETE' then
    v_audit := OLD.audit_id;
  else
    v_audit := NEW.audit_id;
  end if;
  
  select department_id into v_dept from public.audits where id = v_audit;
  
  if v_dept is not null then
    raise notice 'recomputed dept % total %', v_dept, TG_TABLE_NAME;
    perform public.fn_recompute_department_score(v_dept);
    perform public.fn_recompute_org_score();
  end if;
  
  return coalesce(NEW, OLD);
end;
$$;

-- 4. Helper function for esg_settings
create or replace function public.fn_trg_recompute_settings() returns trigger
language plpgsql
security definer
as $$
declare
  r record;
begin
  for r in select id from public.departments loop
    raise notice 'recomputed dept % total %', r.id, TG_TABLE_NAME;
    perform public.fn_recompute_department_score(r.id);
  end loop;
  perform public.fn_recompute_org_score();
  return NEW;
end;
$$;

-- Apply Triggers

-- carbon_transactions (direct)
drop trigger if exists trg_recompute_carbon on public.carbon_transactions;
create trigger trg_recompute_carbon
after insert or update or delete on public.carbon_transactions
for each row execute function public.fn_trg_recompute_dept();

-- diversity_metrics (direct)
drop trigger if exists trg_recompute_diversity on public.diversity_metrics;
create trigger trg_recompute_diversity
after insert or update or delete on public.diversity_metrics
for each row execute function public.fn_trg_recompute_dept();

-- environmental_goals (direct)
drop trigger if exists trg_recompute_goals on public.environmental_goals;
create trigger trg_recompute_goals
after insert or update or delete on public.environmental_goals
for each row execute function public.fn_trg_recompute_dept();

-- audits (direct)
drop trigger if exists trg_recompute_audits on public.audits;
create trigger trg_recompute_audits
after insert or update or delete on public.audits
for each row execute function public.fn_trg_recompute_dept();

-- employee_participations (emp lookup)
drop trigger if exists trg_recompute_employee_parts on public.employee_participations;
create trigger trg_recompute_employee_parts
after insert or update or delete on public.employee_participations
for each row execute function public.fn_trg_recompute_emp();

-- challenge_participations (emp lookup)
drop trigger if exists trg_recompute_challenge_parts on public.challenge_participations;
create trigger trg_recompute_challenge_parts
after insert or update or delete on public.challenge_participations
for each row execute function public.fn_trg_recompute_emp();

-- policy_acknowledgements (emp lookup)
drop trigger if exists trg_recompute_policy_acks on public.policy_acknowledgements;
create trigger trg_recompute_policy_acks
after insert or update or delete on public.policy_acknowledgements
for each row execute function public.fn_trg_recompute_emp();

-- training_completions (emp lookup)
drop trigger if exists trg_recompute_training on public.training_completions;
create trigger trg_recompute_training
after insert or update or delete on public.training_completions
for each row execute function public.fn_trg_recompute_emp();

-- compliance_issues (issue lookup)
drop trigger if exists trg_recompute_issues on public.compliance_issues;
create trigger trg_recompute_issues
after insert or update or delete on public.compliance_issues
for each row execute function public.fn_trg_recompute_issue();

-- esg_settings
drop trigger if exists trg_recompute_settings_all on public.esg_settings;
create trigger trg_recompute_settings_all
after insert or update on public.esg_settings
for each row execute function public.fn_trg_recompute_settings();
