create table public.job_runs (
  id uuid default gen_random_uuid() primary key,
  job_name text not null,
  ran_at timestamptz default now() not null,
  affected_count int default 0,
  note text
);

alter table public.job_runs enable row level security;

create policy "Allow service role read"
  on public.job_runs
  for select
  to service_role
  using (true);
