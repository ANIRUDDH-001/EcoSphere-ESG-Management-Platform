-- b2_02: Challenge lifecycle transitions check trigger
-- fn_check_challenge_transition() — BEFORE UPDATE of status on challenges

create or replace function public.fn_check_challenge_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If status didn't change, proceed
  if old.status = new.status then
    return new;
  end if;

  -- State machine rules:
  -- draft -> active, archived
  -- active -> under_review, completed, archived
  -- under_review -> completed, active, archived
  -- completed -> archived
  -- archived -> (none, locked)
  if old.status = 'draft' and new.status not in ('active', 'archived') then
    raise exception 'Invalid challenge transition from draft to %', new.status;
  elsif old.status = 'active' and new.status not in ('under_review', 'completed', 'archived') then
    raise exception 'Invalid challenge transition from active to %', new.status;
  elsif old.status = 'under_review' and new.status not in ('completed', 'active', 'archived') then
    raise exception 'Invalid challenge transition from under_review to %', new.status;
  elsif old.status = 'completed' and new.status not in ('archived') then
    raise exception 'Invalid challenge transition from completed to %', new.status;
  elsif old.status = 'archived' then
    raise exception 'Cannot transition out of archived state';
  end if;

  raise notice '[fn_check_challenge_transition] allowed challenge % status change from % to %',
    new.id, old.status, new.status;

  return new;
end;
$$;

-- Attach trigger
drop trigger if exists trg_check_challenge_transition on public.challenges;
create trigger trg_check_challenge_transition
  before update of status on public.challenges
  for each row
  execute procedure public.fn_check_challenge_transition();
