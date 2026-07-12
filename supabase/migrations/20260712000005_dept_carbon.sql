-- Migration: department carbon tracking view + goal sync trigger
-- Period: rolling 12 months (matches A3 scoring window)
-- Agreed period: current_date - interval '12 months' to current_date (configurable via param)

-- 1. vw_department_emissions
-- Returns per-department totals and intensity for the scoring period.
-- Intensity = total_co2e / employee_count (0 when count = 0, no divide-by-zero).
create or replace view public.vw_department_emissions as
select
  d.id                                              as department_id,
  d.name                                            as department_name,
  coalesce(d.employee_count, 0)                     as employee_count,
  coalesce(sum(ct.co2e), 0)::numeric                as total_co2e,
  -- intensity: kg CO2e per employee (rolling 12 months)
  case
    when coalesce(d.employee_count, 0) = 0 then 0
    else coalesce(sum(ct.co2e), 0) / d.employee_count
  end::numeric                                      as emissions_intensity
from public.departments d
left join public.carbon_transactions ct
  on  ct.department_id = d.id
  and ct.date >= (current_date - interval '12 months')::date
  and ct.date <= current_date
  and ct.co2e is not null
group by d.id, d.name, d.employee_count;

-- 2. fn_sync_emission_goals
-- Recomputes current_value for co2e-metric goals linked to the affected department.
-- Emission goals have metric = 'co2e'.  current_value becomes the rolling-12-month
-- sum of co2e for that department (same window as vw_department_emissions).
create or replace function public.fn_sync_emission_goals(p_department_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_co2e numeric;
  v_goal       record;
begin
  -- Compute rolling-12-month co2e for the department
  select coalesce(sum(co2e), 0)
    into v_total_co2e
    from public.carbon_transactions
   where department_id = p_department_id
     and date >= (current_date - interval '12 months')::date
     and date <= current_date
     and co2e is not null;

  -- Update all active co2e-metric goals for this department
  for v_goal in
    select id, current_value, name
      from public.environmental_goals
     where department_id = p_department_id
       and lower(trim(metric)) = 'co2e'
       and status in ('active', 'achieved', 'missed')  -- sync even achieved/missed so history is faithful
  loop
    if v_goal.current_value is distinct from v_total_co2e then
      update public.environmental_goals
         set current_value = v_total_co2e
       where id = v_goal.id;

      raise notice 'dept_carbon_sync: goal "%" (id=%) current_value updated %->% for dept=%',
        v_goal.name, v_goal.id, v_goal.current_value, v_total_co2e, p_department_id;
    end if;
  end loop;
end;
$$;

-- 3. fn_trg_sync_emission_goals
-- Trigger wrapper: called after INSERT/UPDATE/DELETE on carbon_transactions.
-- On INSERT/UPDATE sync the new department; on DELETE sync the old department.
create or replace function public.fn_trg_sync_emission_goals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dept_id uuid;
begin
  if tg_op = 'DELETE' then
    v_dept_id := OLD.department_id;
  else
    v_dept_id := NEW.department_id;
  end if;

  -- Only sync when the row has a department linked
  if v_dept_id is not null then
    perform public.fn_sync_emission_goals(v_dept_id);
  end if;

  -- On UPDATE, also sync the old department if it changed
  if tg_op = 'UPDATE' and OLD.department_id is distinct from NEW.department_id
     and OLD.department_id is not null then
    perform public.fn_sync_emission_goals(OLD.department_id);
  end if;

  if tg_op = 'DELETE' then
    return OLD;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_sync_emission_goals on public.carbon_transactions;

create trigger trg_sync_emission_goals
  after insert or update or delete on public.carbon_transactions
  for each row execute procedure public.fn_trg_sync_emission_goals();
