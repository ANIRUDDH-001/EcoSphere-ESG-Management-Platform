-- b1_04: Require evidence before approving a CSR participation if enabled in settings
-- Trigger: fn_require_evidence — BEFORE UPDATE OF approval_status on employee_participations
-- Runs BEFORE fn_award_csr_points (ordered alphabetically: trg_a_require_evidence runs before trg_b_award_csr_points)

create or replace function public.fn_require_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evidence_required bool;
begin
  -- Only act on transition TO 'approved'
  if new.approval_status <> 'approved' or old.approval_status = 'approved' then
    return new;
  end if;

  -- Read evidence toggle from esg_settings singleton (id=1)
  select evidence_required_enabled
    into v_evidence_required
    from public.esg_settings
   where id = 1;

  -- If evidence is required and proof_url is missing, block approval
  if coalesce(v_evidence_required, true) and (new.proof_url is null or new.proof_url = '') then
    raise notice '[fn_require_evidence] blocked approval for participation %: no proof provided', new.id;
    raise exception 'Proof of participation is required for approval.';
  end if;

  return new;
end;
$$;

-- Attach trigger
drop trigger if exists trg_a_require_evidence on public.employee_participations;
create trigger trg_a_require_evidence
  before update of approval_status on public.employee_participations
  for each row
  execute procedure public.fn_require_evidence();
