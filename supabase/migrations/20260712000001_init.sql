-- Enums
create type user_role as enum ('admin', 'manager', 'employee');
create type pillar as enum ('environmental', 'social', 'governance');
create type source_type as enum ('purchase', 'manufacturing', 'expense', 'fleet', 'energy', 'manual');
create type approval_status as enum ('pending', 'approved', 'rejected');
create type challenge_status as enum ('draft', 'active', 'under_review', 'completed', 'archived');
create type issue_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type issue_severity as enum ('low', 'medium', 'high', 'critical');
create type category_type as enum ('csr_activity', 'challenge');
create type goal_status as enum ('active', 'achieved', 'missed', 'archived');
create type notification_type as enum ('compliance_issue', 'approval_decision', 'policy_reminder', 'badge_unlock', 'issue_overdue');
create type audit_result as enum ('pass', 'fail', 'partial', 'pending');

-- Tables

create table departments (
  id uuid default gen_random_uuid() primary key,
  name text,
  code text unique,
  head_id uuid, -- fk added later to avoid circular reference
  parent_id uuid references departments(id),
  employee_count int default 0,
  status text default 'active',
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role user_role,
  department_id uuid references departments(id),
  xp int default 0,
  points_balance int default 0,
  avatar_url text,
  created_at timestamptz default now()
);

alter table departments add foreign key (head_id) references profiles(id) on delete set null;

create table esg_settings (
  id smallint primary key check(id=1),
  env_weight numeric default 0.40,
  social_weight numeric default 0.30,
  gov_weight numeric default 0.30,
  auto_emission_enabled bool default true,
  evidence_required_enabled bool default true,
  badge_auto_award_enabled bool default true,
  notify_in_app bool default true,
  notify_email bool default false,
  updated_at timestamptz,
  created_at timestamptz default now()
);

create table notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  type notification_type,
  title text,
  body text,
  payload jsonb,
  read_at timestamptz,
  created_at timestamptz default now()
);

create table ai_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  model text,
  kind text,
  request_date date default current_date,
  created_at timestamptz default now()
);

create table ai_cache (
  id uuid default gen_random_uuid() primary key,
  cache_key text unique,
  kind text,
  payload jsonb,
  created_at timestamptz default now()
);

create table categories (
  id uuid default gen_random_uuid() primary key,
  name text,
  type category_type,
  status text default 'active',
  created_at timestamptz default now()
);

create table emission_factors (
  id uuid default gen_random_uuid() primary key,
  name text,
  source_type source_type,
  unit text,
  factor_kgco2e numeric,
  reference text,
  valid_from date,
  valid_to date,
  status text default 'active',
  created_at timestamptz default now()
);

create table product_esg_profiles (
  id uuid default gen_random_uuid() primary key,
  product_name text,
  sku text,
  carbon_per_unit numeric,
  recyclable_pct numeric,
  emission_factor_id uuid references emission_factors(id),
  certifications text,
  notes text,
  created_at timestamptz default now()
);

create table environmental_goals (
  id uuid default gen_random_uuid() primary key,
  name text,
  department_id uuid references departments(id),
  metric text,
  baseline numeric,
  target numeric,
  target_date date,
  current_value numeric default 0,
  status goal_status default 'active',
  created_at timestamptz default now()
);

create table esg_policies (
  id uuid default gen_random_uuid() primary key,
  name text,
  pillar pillar,
  body text,
  version text,
  effective_date date,
  requires_ack bool default true,
  owner_id uuid references profiles(id),
  status text default 'active',
  created_at timestamptz default now()
);

create table badges (
  id uuid default gen_random_uuid() primary key,
  name text,
  description text,
  unlock_rule jsonb,
  icon text,
  created_at timestamptz default now()
);

create table rewards (
  id uuid default gen_random_uuid() primary key,
  name text,
  description text,
  points_required int,
  stock int,
  status text default 'active',
  created_at timestamptz default now()
);

create table carbon_transactions (
  id uuid default gen_random_uuid() primary key,
  date date,
  department_id uuid references departments(id),
  source_type source_type,
  source_ref text,
  quantity numeric,
  emission_factor_id uuid references emission_factors(id),
  co2e numeric,
  is_auto bool default false,
  note text,
  created_at timestamptz default now()
);

create table csr_activities (
  id uuid default gen_random_uuid() primary key,
  title text,
  category_id uuid references categories(id),
  department_id uuid references departments(id),
  description text,
  activity_date date,
  location text,
  points int default 0,
  capacity int,
  status text default 'active',
  created_at timestamptz default now()
);

create table employee_participations (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references profiles(id),
  activity_id uuid references csr_activities(id),
  proof_url text,
  approval_status approval_status default 'pending',
  points_earned int default 0,
  completion_date date,
  reviewed_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table challenges (
  id uuid default gen_random_uuid() primary key,
  title text,
  category_id uuid references categories(id),
  description text,
  xp int,
  difficulty text,
  evidence_required bool default true,
  deadline date,
  status challenge_status default 'draft',
  created_at timestamptz default now()
);

create table challenge_participations (
  id uuid default gen_random_uuid() primary key,
  challenge_id uuid references challenges(id),
  employee_id uuid references profiles(id),
  progress int default 0,
  proof_url text,
  approval_status approval_status default 'pending',
  xp_awarded int default 0,
  reviewed_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table policy_acknowledgements (
  id uuid default gen_random_uuid() primary key,
  policy_id uuid references esg_policies(id),
  employee_id uuid references profiles(id),
  acknowledged_at timestamptz,
  status text default 'pending',
  reminder_count int default 0,
  created_at timestamptz default now()
);

create table audits (
  id uuid default gen_random_uuid() primary key,
  title text,
  department_id uuid references departments(id),
  auditor_id uuid references profiles(id),
  scheduled_date date,
  completed_date date,
  findings text,
  result audit_result default 'pending',
  status text default 'open',
  created_at timestamptz default now()
);

create table compliance_issues (
  id uuid default gen_random_uuid() primary key,
  audit_id uuid references audits(id),
  severity issue_severity,
  description text,
  owner_id uuid references profiles(id),
  due_date date,
  status issue_status default 'open',
  is_overdue bool default false,
  created_at timestamptz default now()
);

create table diversity_metrics (
  id uuid default gen_random_uuid() primary key,
  department_id uuid references departments(id),
  period text,
  gender_ratio numeric,
  avg_tenure numeric,
  training_hours numeric,
  headcount int,
  created_at timestamptz default now()
);

create table training_completions (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references profiles(id),
  course_name text,
  completion_pct numeric,
  completed_at date,
  created_at timestamptz default now()
);

create table reward_redemptions (
  id uuid default gen_random_uuid() primary key,
  employee_id uuid references profiles(id),
  reward_id uuid references rewards(id),
  points_spent int,
  status text default 'fulfilled',
  redeemed_at timestamptz default now(),
  created_at timestamptz default now()
);

create table department_scores (
  id uuid default gen_random_uuid() primary key,
  department_id uuid references departments(id) unique,
  environmental_score numeric,
  social_score numeric,
  governance_score numeric,
  total_score numeric,
  updated_at timestamptz,
  created_at timestamptz default now()
);

create table org_score_snapshots (
  id uuid default gen_random_uuid() primary key,
  snapshot_date date,
  overall_esg numeric,
  environmental numeric,
  social numeric,
  governance numeric,
  created_at timestamptz default now()
);

-- Indexes for foreign keys and hot filters
create index idx_profiles_department_id on profiles(department_id);
create index idx_departments_head_id on departments(head_id);
create index idx_departments_parent_id on departments(parent_id);

create index idx_notifications_user_id on notifications(user_id, read_at);
create index idx_ai_usage_user_id on ai_usage(user_id);
create index idx_product_esg_profiles_emission_factor_id on product_esg_profiles(emission_factor_id);
create index idx_environmental_goals_department_id on environmental_goals(department_id);
create index idx_esg_policies_owner_id on esg_policies(owner_id);

create index idx_carbon_transactions_department_date on carbon_transactions(department_id, date);
create index idx_carbon_transactions_emission_factor_id on carbon_transactions(emission_factor_id);

create index idx_csr_activities_category_id on csr_activities(category_id);
create index idx_csr_activities_department_id on csr_activities(department_id);

create index idx_employee_participations_activity_approval on employee_participations(activity_id, approval_status);
create index idx_employee_participations_employee_id on employee_participations(employee_id);
create index idx_employee_participations_reviewed_by on employee_participations(reviewed_by);

create index idx_challenges_category_id on challenges(category_id);

create index idx_challenge_participations_challenge_id on challenge_participations(challenge_id);
create index idx_challenge_participations_employee_id on challenge_participations(employee_id);
create index idx_challenge_participations_reviewed_by on challenge_participations(reviewed_by);

create index idx_policy_acknowledgements_policy_id on policy_acknowledgements(policy_id);
create index idx_policy_acknowledgements_employee_id on policy_acknowledgements(employee_id);

create index idx_audits_department_id on audits(department_id);
create index idx_audits_auditor_id on audits(auditor_id);

create index idx_compliance_issues_status_due_date on compliance_issues(status, due_date);
create index idx_compliance_issues_audit_id on compliance_issues(audit_id);
create index idx_compliance_issues_owner_id on compliance_issues(owner_id);

create index idx_diversity_metrics_department_id on diversity_metrics(department_id);
create index idx_training_completions_employee_id on training_completions(employee_id);
create index idx_reward_redemptions_employee_id on reward_redemptions(employee_id);
create index idx_reward_redemptions_reward_id on reward_redemptions(reward_id);

-- Enable RLS
alter table profiles enable row level security;
alter table esg_settings enable row level security;
alter table notifications enable row level security;
alter table ai_usage enable row level security;
alter table ai_cache enable row level security;
alter table departments enable row level security;
alter table categories enable row level security;
alter table emission_factors enable row level security;
alter table product_esg_profiles enable row level security;
alter table environmental_goals enable row level security;
alter table esg_policies enable row level security;
alter table badges enable row level security;
alter table rewards enable row level security;
alter table carbon_transactions enable row level security;
alter table csr_activities enable row level security;
alter table employee_participations enable row level security;
alter table challenges enable row level security;
alter table challenge_participations enable row level security;
alter table policy_acknowledgements enable row level security;
alter table audits enable row level security;
alter table compliance_issues enable row level security;
alter table diversity_metrics enable row level security;
alter table training_completions enable row level security;
alter table reward_redemptions enable row level security;
alter table department_scores enable row level security;
alter table org_score_snapshots enable row level security;
