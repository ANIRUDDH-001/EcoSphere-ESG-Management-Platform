-- b2_00: Create badge_awards junction table
-- employee_id (fk profiles), badge_id (fk badges), awarded_at timestamp

create table if not exists public.badge_awards (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references public.profiles(id) on delete cascade,
  badge_id uuid references public.badges(id) on delete cascade,
  awarded_at timestamptz default now(),
  created_at timestamptz default now(),
  constraint badge_awards_emp_badge_unique unique (employee_id, badge_id)
);

-- Enable RLS
alter table public.badge_awards enable row level security;

-- Policy: Employees can view their own badge awards
create policy "badge_awards_select_own"
  on public.badge_awards for select
  to authenticated
  using (employee_id = auth.uid());

-- Policy: Managers and Admins can view all badge awards
create policy "badge_awards_select_manager_admin"
  on public.badge_awards for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role in ('manager', 'admin')
    )
  );

-- Policy: Admin can insert badge awards (auto-award engine runs as service role / admin scope)
create policy "badge_awards_insert_admin"
  on public.badge_awards for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );
