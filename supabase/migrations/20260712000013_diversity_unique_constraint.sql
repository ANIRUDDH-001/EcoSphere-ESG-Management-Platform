-- b1_05: Add unique constraint to diversity_metrics on (department_id, period)
-- This allows upsert operations to resolve conflicts correctly and avoids duplicate period reports.

alter table public.diversity_metrics
  add constraint diversity_metrics_dept_period_key unique (department_id, period);
