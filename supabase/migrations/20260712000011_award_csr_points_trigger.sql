-- b1_03: Award points when a CSR participation is approved
-- Trigger: fn_award_csr_points — AFTER UPDATE OF approval_status on employee_participations
-- Idempotent: skips re-award if already awarded (points_earned > 0 check)
-- Notification: fires 'approval_decision' via create_notification()

create or replace function public.fn_award_csr_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_activity_points int;
  v_activity_title  text;
begin
  -- Only act on transition TO 'approved'
  if new.approval_status <> 'approved' or old.approval_status = 'approved' then
    return new;
  end if;

  -- Idempotent guard: do not double-award
  if coalesce(new.points_earned, 0) > 0 then
    raise notice '[fn_award_csr_points] skipping re-award for participation %', new.id;
    return new;
  end if;

  -- Fetch activity points and title
  select points, title
    into v_activity_points, v_activity_title
    from public.csr_activities
   where id = new.activity_id;

  -- Award points on the participation row
  new.points_earned     := coalesce(v_activity_points, 0);
  new.completion_date   := coalesce(new.completion_date, current_date);

  -- Add to employee's points_balance
  update public.profiles
     set points_balance = coalesce(points_balance, 0) + coalesce(v_activity_points, 0)
   where id = new.employee_id;

  raise notice '[fn_award_csr_points] awarded % points to employee % for participation %',
    v_activity_points, new.employee_id, new.id;

  -- Fire approval_decision notification
  perform public.create_notification(
    p_user    := new.employee_id,
    p_type    := 'approval_decision',
    p_title   := 'CSR Participation Approved',
    p_body    := format('Your participation in "%s" has been approved. %s points awarded.',
                         coalesce(v_activity_title, 'the activity'),
                         coalesce(v_activity_points, 0)),
    p_payload := jsonb_build_object(
                   'participation_id', new.id,
                   'activity_id',      new.activity_id,
                   'points',           v_activity_points
                 )
  );

  return new;
end;
$$;

-- Attach trigger (BEFORE UPDATE so we can mutate NEW.points_earned in-place)
drop trigger if exists trg_award_csr_points on public.employee_participations;
drop trigger if exists trg_b_award_csr_points on public.employee_participations;
create trigger trg_b_award_csr_points
  before update of approval_status on public.employee_participations
  for each row
  execute procedure public.fn_award_csr_points();
