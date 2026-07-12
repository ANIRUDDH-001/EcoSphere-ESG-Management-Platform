-- Migration: auto emission trigger
-- Appended after 20260712000003_functions.sql
-- When auto_emission_enabled is on and a carbon_transactions row is inserted without
-- an emission_factor_id (and source_type <> 'manual'), this trigger resolves exactly
-- one active factor for that source_type + date, sets co2e and is_auto=true.
-- Ambiguous (0 or >1 matching factors) → RAISE NOTICE, leave co2e null, is_auto=false.

create or replace function public.fn_auto_emission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled      bool;
  v_factor_id    uuid;
  v_factor_kgco2e numeric;
  v_count        int;
  v_txn_date     date;
begin
  -- Only act when no factor was explicitly supplied and source is not manual
  if NEW.emission_factor_id is not null then
    return NEW;
  end if;

  if NEW.source_type = 'manual' or NEW.source_type is null then
    return NEW;
  end if;

  -- Check the toggle
  select coalesce(auto_emission_enabled, false)
    into v_enabled
    from public.esg_settings
   where id = 1;

  if not v_enabled then
    return NEW;
  end if;

  -- Use transaction date for factor validity window; fall back to today
  v_txn_date := coalesce(NEW.date::date, current_date);

  -- Count how many active factors cover this source_type on that date
  select count(*) into v_count
    from public.emission_factors
   where source_type = NEW.source_type
     and status = 'active'
     and (valid_from is null or valid_from <= v_txn_date)
     and (valid_to   is null or valid_to   >= v_txn_date);

  if v_count = 0 then
    raise notice 'auto_emission: no active factor for source_type=% on date=%; co2e left null',
      NEW.source_type, v_txn_date;
    return NEW;
  end if;

  if v_count > 1 then
    raise notice 'auto_emission: % overlapping active factors for source_type=% on date=%; co2e left null (ambiguous)',
      v_count, NEW.source_type, v_txn_date;
    return NEW;
  end if;

  -- Exactly one factor — resolve and compute
  select id, factor_kgco2e
    into v_factor_id, v_factor_kgco2e
    from public.emission_factors
   where source_type = NEW.source_type
     and status = 'active'
     and (valid_from is null or valid_from <= v_txn_date)
     and (valid_to   is null or valid_to   >= v_txn_date)
   limit 1;

  NEW.emission_factor_id := v_factor_id;
  NEW.co2e               := NEW.quantity * coalesce(v_factor_kgco2e, 0);
  NEW.is_auto            := true;

  raise notice 'auto_emission: co2e=% for source_type=% dept=%',
    NEW.co2e, NEW.source_type, NEW.department_id;

  return NEW;
end;
$$;

-- Drop-and-recreate is idempotent; BEFORE INSERT so we can modify NEW
drop trigger if exists trg_auto_emission on public.carbon_transactions;

create trigger trg_auto_emission
  before insert on public.carbon_transactions
  for each row execute procedure public.fn_auto_emission();
