-- Migration: Social Score Function
-- Implements fn_social_score(p_dept uuid) returning numeric

create or replace function public.fn_social_score(p_dept uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  v_employee_count int;
  v_participation_rate numeric;
  v_training_completion numeric;
  v_diversity_index numeric;
  
  v_gender_score numeric;
  v_tenure_score numeric;
  v_hours_score numeric;
  v_div_row record;
  v_social_score numeric;
begin
  -- Get department employee count
  select coalesce(employee_count, 0) into v_employee_count from public.departments where id = p_dept;

  -- 1. Participation Rate
  -- distinct employees with approved CSR participation in the period / employee_count * 100
  if v_employee_count = 0 then
    v_participation_rate := 0;
  else
    select (count(distinct ep.employee_id)::numeric / v_employee_count) * 100
      into v_participation_rate
      from public.employee_participations ep
      join public.profiles p on p.id = ep.employee_id
     where p.department_id = p_dept
       and ep.approval_status = 'approved'
       and ep.completion_date >= (current_date - interval '12 months')::date
       and ep.completion_date <= current_date;
       
    v_participation_rate := coalesce(least(greatest(v_participation_rate, 0), 100), 0);
  end if;

  -- 2. Training Completion
  -- avg training_completions.completion_pct for the dept
  select coalesce(avg(tc.completion_pct), 0)
    into v_training_completion
    from public.training_completions tc
    join public.profiles p on p.id = tc.employee_id
   where p.department_id = p_dept;
   
  v_training_completion := coalesce(least(greatest(v_training_completion, 0), 100), 0);

  -- 3. Diversity Index
  select * into v_div_row
    from public.diversity_metrics
   where department_id = p_dept
   order by period desc
   limit 1;
   
  if not found then
    v_diversity_index := 70;
  else
    -- gender_ratio mapping (closeness to 0.5)
    v_gender_score := 100 - (abs(coalesce(v_div_row.gender_ratio, 0.5) - 0.5) * 200);
    v_gender_score := least(greatest(v_gender_score, 0), 100);
    
    -- avg_tenure mapping (bucketed)
    if coalesce(v_div_row.avg_tenure, 0) >= 5 then v_tenure_score := 100;
    elsif coalesce(v_div_row.avg_tenure, 0) >= 3 then v_tenure_score := 80;
    elsif coalesce(v_div_row.avg_tenure, 0) >= 1 then v_tenure_score := 50;
    else v_tenure_score := 20;
    end if;
    
    -- training_hours vs target of 40
    v_hours_score := least(greatest((coalesce(v_div_row.training_hours, 0) * 100.0) / 40.0, 0), 100);
    
    v_diversity_index := (v_gender_score + v_tenure_score + v_hours_score) / 3.0;
  end if;
  
  -- Blend
  v_social_score := (0.4 * v_participation_rate) + (0.3 * v_training_completion) + (0.3 * v_diversity_index);
  
  raise notice 'social_debug: part=%, train=%, div=%', v_participation_rate, v_training_completion, v_diversity_index;
  
  return round(v_social_score, 2);
end;
$$;
