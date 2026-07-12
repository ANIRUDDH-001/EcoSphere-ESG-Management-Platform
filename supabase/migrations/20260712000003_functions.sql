-- 1. create_notification
-- Called by: Various modules (A2, B1, B2, B3) to emit notifications decoupling them from delivery logic.
create or replace function public.create_notification(
  p_user uuid,
  p_type notification_type,
  p_title text,
  p_body text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language sql
security definer
set search_path = public
as $$
  insert into notifications (user_id, type, title, body, payload)
  values (p_user, p_type, p_title, p_body, p_payload)
  returning id;
$$;

-- 2. handle_new_user
-- Called by: Supabase Auth (trigger on auth.users insert)
-- Purpose: Ensures every new auth user automatically gets a profiles row (required for RLS).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'employee')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Note: The trigger is created in auth schema which requires special permissions.
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. set_updated_at
-- Called by: Triggers on esg_settings, department_scores (before update)
-- Purpose: Maintains consistent updated_at timestamps automatically.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_esg_settings_updated_at
  before update on public.esg_settings
  for each row execute procedure public.set_updated_at();

create trigger set_department_scores_updated_at
  before update on public.department_scores
  for each row execute procedure public.set_updated_at();

-- 4. sync_department_employee_count
-- Called by: Trigger on profiles (after insert, update, delete)
-- Purpose: Maintains accurate employee_count on departments for weight calculations.
create or replace function public.sync_department_employee_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT' and new.department_id is not null) then
    update departments set employee_count = employee_count + 1 where id = new.department_id;
  elsif (tg_op = 'UPDATE') then
    if (old.department_id is distinct from new.department_id) then
      if (old.department_id is not null) then
        update departments set employee_count = employee_count - 1 where id = old.department_id;
      end if;
      if (new.department_id is not null) then
        update departments set employee_count = employee_count + 1 where id = new.department_id;
      end if;
    end if;
  elsif (tg_op = 'DELETE' and old.department_id is not null) then
    update departments set employee_count = employee_count - 1 where id = old.department_id;
  end if;
  return null;
end;
$$;

create trigger sync_department_employee_count_trigger
  after insert or update or delete on public.profiles
  for each row execute procedure public.sync_department_employee_count();
