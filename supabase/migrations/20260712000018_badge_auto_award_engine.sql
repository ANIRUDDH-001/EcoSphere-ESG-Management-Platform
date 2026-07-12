-- b2_04: Badge auto-award engine
-- Trigger-based evaluation of badge unlock rules on XP change and participation approval

-- ─── fn_evaluate_badges(p_employee uuid) ─────────────────────────────────────
create or replace function public.fn_evaluate_badges(p_employee uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
  v_xp integer;
  v_challenges_completed integer;
  v_participations_approved integer;
  v_badge record;
  v_rule jsonb;
  v_gte integer;
  v_passes boolean;
begin
  -- Check feature toggle (badge_auto_award_enabled in esg_settings)
  select coalesce((value::jsonb)::boolean, true)
  into v_enabled
  from public.esg_settings
  where key = 'badge_auto_award_enabled';

  if not coalesce(v_enabled, true) then
    raise notice '[fn_evaluate_badges] badge_auto_award_enabled=false, skipping for employee %', p_employee;
    return;
  end if;

  -- Compute employee stats
  select coalesce(xp, 0) into v_xp
  from public.profiles where id = p_employee;

  select count(*) into v_challenges_completed
  from public.challenge_participations
  where employee_id = p_employee and approval_status = 'approved';

  select count(*) into v_participations_approved
  from public.employee_participations
  where employee_id = p_employee and approval_status = 'approved';

  raise notice '[fn_evaluate_badges] stats for %: xp=%, ch_completed=%, part_approved=%',
    p_employee, v_xp, v_challenges_completed, v_participations_approved;

  -- Loop all badges and evaluate their unlock_rule
  for v_badge in
    select id, name, unlock_rule
    from public.badges
    where unlock_rule is not null
  loop
    v_rule := v_badge.unlock_rule;
    v_passes := false;

    -- Parse and evaluate the rule
    begin
      v_gte := (v_rule->>'gte')::integer;

      case v_rule->>'type'
        when 'xp' then
          v_passes := v_xp >= v_gte;
        when 'challenges_completed' then
          v_passes := v_challenges_completed >= v_gte;
        when 'participations_approved' then
          v_passes := v_participations_approved >= v_gte;
        else
          v_passes := false;
      end case;
    exception when others then
      raise notice '[fn_evaluate_badges] could not parse unlock_rule for badge %, skipping', v_badge.id;
      continue;
    end;

    if v_passes then
      -- Idempotent insert (unique constraint on employee_id, badge_id guards duplicates)
      insert into public.badge_awards (employee_id, badge_id)
      values (p_employee, v_badge.id)
      on conflict (employee_id, badge_id) do nothing;

      if found then
        raise notice '[fn_evaluate_badges] awarded badge "%" to employee %', v_badge.name, p_employee;

        -- Notify employee of badge unlock
        insert into public.notifications (employee_id, type, payload)
        values (
          p_employee,
          'badge_unlock',
          jsonb_build_object(
            'badge_id', v_badge.id,
            'badge_name', v_badge.name
          )
        );
      end if;
    end if;
  end loop;
end;
$$;

-- ─── Trigger: evaluate badges on profile XP change ────────────────────────────
create or replace function public.trg_fn_profile_xp_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.xp is distinct from new.xp then
    perform public.fn_evaluate_badges(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profile_xp_badges on public.profiles;
create trigger trg_profile_xp_badges
  after update of xp on public.profiles
  for each row
  execute procedure public.trg_fn_profile_xp_badges();

-- ─── Trigger: evaluate badges on challenge participation approved ─────────────
create or replace function public.trg_fn_challenge_part_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.approval_status = 'approved' and
     (old.approval_status is distinct from new.approval_status) then
    perform public.fn_evaluate_badges(new.employee_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_challenge_part_badges on public.challenge_participations;
create trigger trg_challenge_part_badges
  after update of approval_status on public.challenge_participations
  for each row
  execute procedure public.trg_fn_challenge_part_badges();

-- ─── Trigger: evaluate badges on CSR participation approved ──────────────────
create or replace function public.trg_fn_emp_part_badges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.approval_status = 'approved' and
     (old.approval_status is distinct from new.approval_status) then
    perform public.fn_evaluate_badges(new.employee_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_emp_part_badges on public.employee_participations;
create trigger trg_emp_part_badges
  after update of approval_status on public.employee_participations
  for each row
  execute procedure public.trg_fn_emp_part_badges();
