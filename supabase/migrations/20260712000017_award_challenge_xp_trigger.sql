-- b2_03: XP Award on challenge participation approval
-- fn_award_challenge_xp() — AFTER UPDATE OF approval_status on challenge_participations

create or replace function public.fn_award_challenge_xp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_challenge_xp integer;
  v_challenge_evidence_required boolean;
begin
  -- Only act on transition TO 'approved'
  if new.approval_status <> 'approved' or old.approval_status = 'approved' then
    return new;
  end if;

  -- Idempotency guard: XP already awarded
  if coalesce(new.xp_awarded, 0) > 0 then
    raise notice '[fn_award_challenge_xp] XP already awarded for participation %, skipping', new.id;
    return new;
  end if;

  -- Fetch challenge xp and evidence_required
  select xp, evidence_required
  into v_challenge_xp, v_challenge_evidence_required
  from public.challenges
  where id = new.challenge_id;

  -- Evidence gate: block approval if proof required but not provided
  if v_challenge_evidence_required and (new.proof_url is null or new.proof_url = '') then
    raise exception 'Cannot approve challenge participation %: evidence required but proof_url is missing', new.id;
  end if;

  -- Default xp to 0 if null
  v_challenge_xp := coalesce(v_challenge_xp, 0);

  -- Award XP to the employee's profile (idempotent increment)
  update public.profiles
  set xp = coalesce(xp, 0) + v_challenge_xp
  where id = new.employee_id;

  -- Record xp_awarded on the participation row
  new.xp_awarded := v_challenge_xp;

  -- Create approval notification
  perform public.create_notification(
    p_user    := new.employee_id,
    p_type    := 'approval_decision',
    p_title   := 'Challenge Approved',
    p_body    := format('Your challenge submission has been approved. %s XP awarded.', v_challenge_xp),
    p_payload := jsonb_build_object(
      'source', 'challenge_participation',
      'participation_id', new.id,
      'challenge_id', new.challenge_id,
      'decision', 'approved',
      'xp_awarded', v_challenge_xp,
      'reviewed_by', new.reviewed_by
    )
  );

  raise notice '[fn_award_challenge_xp] Awarded % XP to employee % for challenge %',
    v_challenge_xp, new.employee_id, new.challenge_id;

  return new;
end;
$$;

-- Attach trigger (BEFORE UPDATE so we can modify new.xp_awarded)
drop trigger if exists trg_award_challenge_xp on public.challenge_participations;
create trigger trg_award_challenge_xp
  before update of approval_status on public.challenge_participations
  for each row
  execute procedure public.fn_award_challenge_xp();
