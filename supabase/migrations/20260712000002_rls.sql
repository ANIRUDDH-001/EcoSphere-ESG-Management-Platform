-- RLS Helpers
create or replace function public.auth_role()
returns public.user_role
language sql
security definer
set search_path = public
stable
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.auth_dept()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select department_id from profiles where id = auth.uid();
$$;

-- 1. Profiles
create policy "profiles_select_all" on profiles for select using (true);
create policy "profiles_update_own" on profiles for update using (id = auth.uid());
create policy "profiles_admin_all" on profiles for all using (public.auth_role() = 'admin');

-- 2. Master & Config tables (Read all, write admin)
create policy "settings_select_all" on esg_settings for select using (true);
create policy "settings_admin_all" on esg_settings for all using (public.auth_role() = 'admin');

create policy "emission_factors_select_all" on emission_factors for select using (true);
create policy "emission_factors_admin_all" on emission_factors for all using (public.auth_role() = 'admin');

create policy "esg_policies_select_all" on esg_policies for select using (true);
create policy "esg_policies_admin_all" on esg_policies for all using (public.auth_role() = 'admin');

create policy "badges_select_all" on badges for select using (true);
create policy "badges_admin_all" on badges for all using (public.auth_role() = 'admin');

create policy "rewards_select_all" on rewards for select using (true);
create policy "rewards_admin_all" on rewards for all using (public.auth_role() = 'admin');

create policy "categories_select_all" on categories for select using (true);
create policy "categories_admin_all" on categories for all using (public.auth_role() = 'admin');

create policy "departments_select_all" on departments for select using (true);
create policy "departments_admin_all" on departments for all using (public.auth_role() = 'admin');

create policy "goals_select_all" on environmental_goals for select using (true);
create policy "goals_admin_all" on environmental_goals for all using (public.auth_role() = 'admin');

create policy "product_profiles_select_all" on product_esg_profiles for select using (true);
create policy "product_profiles_admin_all" on product_esg_profiles for all using (public.auth_role() = 'admin');

create policy "department_scores_select_all" on department_scores for select using (true);
create policy "department_scores_admin_all" on department_scores for all using (public.auth_role() = 'admin');

create policy "org_scores_select_all" on org_score_snapshots for select using (true);
create policy "org_scores_admin_all" on org_score_snapshots for all using (public.auth_role() = 'admin');

-- 3. Notifications (Own read/update, admin all)
create policy "notifications_select_own" on notifications for select using (user_id = auth.uid());
create policy "notifications_update_own" on notifications for update using (user_id = auth.uid());
create policy "notifications_admin_all" on notifications for all using (public.auth_role() = 'admin');

-- 4. AI usage & cache
create policy "ai_usage_select_own" on ai_usage for select using (user_id = auth.uid());
create policy "ai_usage_insert_own" on ai_usage for insert with check (user_id = auth.uid());
create policy "ai_usage_admin_all" on ai_usage for all using (public.auth_role() = 'admin');

create policy "ai_cache_admin_all" on ai_cache for all using (public.auth_role() = 'admin');
create policy "ai_cache_read_all" on ai_cache for select using (true);

-- 5. Transactional Tables
-- carbon_transactions
create policy "carbon_transactions_dept_manager_select" on carbon_transactions for select using (
  department_id = public.auth_dept() and public.auth_role() = 'manager'
);
create policy "carbon_transactions_manager_insert" on carbon_transactions for insert with check (
  department_id = public.auth_dept() and public.auth_role() = 'manager'
);
create policy "carbon_transactions_admin_all" on carbon_transactions for all using (public.auth_role() = 'admin');

-- csr_activities
create policy "csr_activities_select_all" on csr_activities for select using (true);
create policy "csr_activities_manager_insert" on csr_activities for insert with check (
  department_id = public.auth_dept() and public.auth_role() = 'manager'
);
create policy "csr_activities_manager_update" on csr_activities for update using (
  department_id = public.auth_dept() and public.auth_role() = 'manager'
);
create policy "csr_activities_admin_all" on csr_activities for all using (public.auth_role() = 'admin');

-- employee_participations
create policy "ep_select_own" on employee_participations for select using (employee_id = auth.uid());
create policy "ep_insert_own" on employee_participations for insert with check (employee_id = auth.uid());
create policy "ep_manager_read" on employee_participations for select using (
  public.auth_role() = 'manager' and
  exists (select 1 from csr_activities c where c.id = activity_id and c.department_id = public.auth_dept())
);
create policy "ep_manager_update" on employee_participations for update using (
  public.auth_role() = 'manager' and
  exists (select 1 from csr_activities c where c.id = activity_id and c.department_id = public.auth_dept())
);
create policy "ep_admin_all" on employee_participations for all using (public.auth_role() = 'admin');

-- challenges
create policy "challenges_select_all" on challenges for select using (true);
create policy "challenges_manager_all" on challenges for all using (public.auth_role() = 'manager');
create policy "challenges_admin_all" on challenges for all using (public.auth_role() = 'admin');

-- challenge_participations
create policy "cp_select_own" on challenge_participations for select using (employee_id = auth.uid());
create policy "cp_insert_own" on challenge_participations for insert with check (employee_id = auth.uid());
create policy "cp_manager_read" on challenge_participations for select using (
  public.auth_role() = 'manager' and
  exists (select 1 from profiles p where p.id = employee_id and p.department_id = public.auth_dept())
);
create policy "cp_manager_update" on challenge_participations for update using (
  public.auth_role() = 'manager' and
  exists (select 1 from profiles p where p.id = employee_id and p.department_id = public.auth_dept())
);
create policy "cp_admin_all" on challenge_participations for all using (public.auth_role() = 'admin');

-- policy_acknowledgements
create policy "pa_select_own" on policy_acknowledgements for select using (employee_id = auth.uid());
create policy "pa_insert_own" on policy_acknowledgements for insert with check (employee_id = auth.uid());
create policy "pa_update_own" on policy_acknowledgements for update using (employee_id = auth.uid());
create policy "pa_manager_read" on policy_acknowledgements for select using (
  public.auth_role() = 'manager' and
  exists (select 1 from profiles p where p.id = employee_id and p.department_id = public.auth_dept())
);
create policy "pa_admin_all" on policy_acknowledgements for all using (public.auth_role() = 'admin');

-- audits
create policy "audits_manager_read" on audits for select using (
  department_id = public.auth_dept() and public.auth_role() = 'manager'
);
create policy "audits_admin_all" on audits for all using (public.auth_role() = 'admin');

-- compliance_issues
create policy "ci_owner_select" on compliance_issues for select using (owner_id = auth.uid());
create policy "ci_owner_update" on compliance_issues for update using (owner_id = auth.uid());
create policy "ci_manager_read" on compliance_issues for select using (
  public.auth_role() = 'manager' and
  exists (select 1 from audits a where a.id = audit_id and a.department_id = public.auth_dept())
);
create policy "ci_admin_all" on compliance_issues for all using (public.auth_role() = 'admin');

-- diversity_metrics
create policy "dm_manager_read" on diversity_metrics for select using (
  department_id = public.auth_dept() and public.auth_role() = 'manager'
);
create policy "dm_admin_all" on diversity_metrics for all using (public.auth_role() = 'admin');

-- training_completions
create policy "tc_select_own" on training_completions for select using (employee_id = auth.uid());
create policy "tc_manager_read" on training_completions for select using (
  public.auth_role() = 'manager' and
  exists (select 1 from profiles p where p.id = employee_id and p.department_id = public.auth_dept())
);
create policy "tc_admin_all" on training_completions for all using (public.auth_role() = 'admin');

-- reward_redemptions
create policy "rr_select_own" on reward_redemptions for select using (employee_id = auth.uid());
create policy "rr_insert_own" on reward_redemptions for insert with check (employee_id = auth.uid());
create policy "rr_admin_all" on reward_redemptions for all using (public.auth_role() = 'admin');

-- job_runs (add admin to existing table)
create policy "job_runs_admin_all" on job_runs for all using (public.auth_role() = 'admin');
