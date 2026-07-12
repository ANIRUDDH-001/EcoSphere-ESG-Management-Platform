# ARCHITECTURE.md — EcoSphere ESG Platform (canonical)

> This is the **single source of truth** for names, shapes, and rules. Every phase prompt refers
> here. If it's not written here or in a phase prompt, ask the human — do not invent it.

Repo: `EcoSphere-ESG-Management-Platform` · Single branch: `main` · Team: Lead (Track A) + Teammate (Track B).

---

## 1. Stack (LOCKED)

| Layer | Choice | Deploys to |
|---|---|---|
| Frontend | React 18 + Vite + TypeScript, React Router v6, TanStack Query, shadcn/ui + Tailwind, Recharts, React Hook Form + Zod | **Firebase Hosting** (`web/`) |
| Backend service | **Node + Hono + TypeScript** — Gemini model-router, email (Resend), AI-assisted exports | **Cloud Run** (`api/`) |
| Data plane | **Supabase**: Postgres + RLS + Auth + Storage + triggers + `pg_cron`/`pg_net` | Supabase project |
| AI | **Gemini** (multi-model router) + **Gemma** (single-shot), function-calling copilot | via `api/` |
| Package manager | **pnpm** workspaces (`web`, `api`, optional `shared`) | — |

**Data flow:** `web` → Supabase (`supabase-js`, user JWT, RLS) for **all CRUD**; `web` → `api`
(Cloud Run, user JWT) for **AI / email / AI-summary exports** only. No custom CRUD server.

**Deploy / push-to-prod (agent-driven):** the implementing agent has **terminal access to Google Cloud
(Cloud Run) and Firebase** and to the **Supabase MCP** — so it can go from project creation to live
deploy itself: `firebase deploy` (or `firebase hosting`) for `web/`, `gcloud run deploy` for `api/`,
and `apply_migration` / `supabase db push` for the data plane. All three hosts are cloud-managed; no
local server in prod. Trunk-based: everything lands on `main` before the final deploy. Secrets live only
in Cloud Run env (see §10) — never in the web bundle or the repo.

---

## 2. Roles & auth (LOCKED)

- Supabase Auth, **email/password**, with **seeded role accounts** for demo:
  `admin@ecosphere.test`, `manager@ecosphere.test`, `employee@ecosphere.test` (+ a few employees).
- Roles: **`admin`**, **`manager`** (department head), **`employee`**.
- `profiles` row per user mirrors `auth.users`. Role + department live on `profiles`.
- RLS references `profiles.role` and `profiles.department_id`. `api/` verifies JWT and forwards it.

**Role capabilities (enforced by RLS + UI):**
- **employee**: see org/own data, join CSR & challenges, upload proof, acknowledge policies, redeem rewards.
- **manager**: everything employee can + approve participations/challenges for their department, own compliance issues, see dept dashboards.
- **admin**: full config (master data, settings, all approvals, audits, rewards catalog, users).

---

## 3. Canonical database schema

> Table & column names are **binding**. `snake_case`. All tables have `id uuid default gen_random_uuid() primary key`
> and `created_at timestamptz default now()` unless noted. **RLS ON for every table** with explicit policies.

### 3.1 Enums

```
user_role         : admin | manager | employee
pillar            : environmental | social | governance
source_type       : purchase | manufacturing | expense | fleet | energy | manual
approval_status   : pending | approved | rejected
challenge_status  : draft | active | under_review | completed | archived
issue_status      : open | in_progress | resolved | closed
issue_severity    : low | medium | high | critical
category_type     : csr_activity | challenge
goal_status       : active | achieved | missed | archived
notification_type : compliance_issue | approval_decision | policy_reminder | badge_unlock | issue_overdue
audit_result      : pass | fail | partial | pending
```

### 3.2 Foundation & identity (owned by Phase 00)

- **profiles**(id [=auth.users.id], full_name, email, role `user_role`, department_id → departments, xp int default 0, points_balance int default 0, avatar_url, created_at)
- **esg_settings** (singleton, id smallint check(id=1)): env_weight numeric default 0.40, social_weight numeric default 0.30, gov_weight numeric default 0.30, auto_emission_enabled bool default true, evidence_required_enabled bool default true, badge_auto_award_enabled bool default true, notify_in_app bool default true, notify_email bool default false, updated_at
- **notifications**(id, user_id → profiles, type `notification_type`, title, body, payload jsonb, read_at, created_at)
- **ai_usage**(id, user_id → profiles, model text, kind text, request_date date default current_date, created_at) — rate-limit ledger for the model router.
- **ai_cache**(id, cache_key text unique, kind text, payload jsonb, created_at) — cached insights/summaries.

### 3.3 Master data

- **departments**(name, code unique, head_id → profiles, parent_id → departments, employee_count int default 0, status text default 'active')
- **categories**(name, type `category_type`, status text default 'active')  ← CSR & Challenge categories
- **emission_factors**(name, source_type `source_type`, unit text, factor_kgco2e numeric, reference text, valid_from date, valid_to date, status text default 'active')
- **product_esg_profiles**(product_name, sku, carbon_per_unit numeric, recyclable_pct numeric, emission_factor_id → emission_factors, certifications text, notes text)
- **environmental_goals**(name, department_id → departments (nullable = org-wide), metric text, baseline numeric, target numeric, target_date date, current_value numeric default 0, status `goal_status` default 'active')
- **esg_policies**(name, pillar `pillar`, body text, version text, effective_date date, requires_ack bool default true, owner_id → profiles, status text default 'active')
- **badges**(name, description, unlock_rule jsonb, icon text)   ← unlock_rule e.g. `{"type":"xp","gte":500}` or `{"type":"challenges_completed","gte":5}`
- **rewards**(name, description, points_required int, stock int, status text default 'active')

### 3.4 Transactional data

- **carbon_transactions**(date date, department_id → departments, source_type `source_type`, source_ref text, quantity numeric, emission_factor_id → emission_factors, co2e numeric, is_auto bool default false, note text)
- **csr_activities**(title, category_id → categories, department_id → departments, description, activity_date date, location text, points int default 0, capacity int, status text default 'active')
- **employee_participations**(employee_id → profiles, activity_id → csr_activities, proof_url text, approval_status `approval_status` default 'pending', points_earned int default 0, completion_date date, reviewed_by → profiles)
- **challenges**(title, category_id → categories, description, xp int, difficulty text, evidence_required bool default true, deadline date, status `challenge_status` default 'draft')
- **challenge_participations**(challenge_id → challenges, employee_id → profiles, progress int default 0, proof_url text, approval_status `approval_status` default 'pending', xp_awarded int default 0, reviewed_by → profiles)
- **policy_acknowledgements**(policy_id → esg_policies, employee_id → profiles, acknowledged_at timestamptz, status text default 'pending', reminder_count int default 0)
- **audits**(title, department_id → departments, auditor_id → profiles, scheduled_date date, completed_date date, findings text, result `audit_result` default 'pending', status text default 'open')
- **compliance_issues**(audit_id → audits, severity `issue_severity`, description, owner_id → profiles, due_date date, status `issue_status` default 'open', is_overdue bool default false)
- **diversity_metrics**(department_id → departments, period text, gender_ratio numeric, avg_tenure numeric, training_hours numeric, headcount int)  ← Social pillar inputs
- **training_completions**(employee_id → profiles, course_name text, completion_pct numeric, completed_at date)
- **reward_redemptions**(employee_id → profiles, reward_id → rewards, points_spent int, status text default 'fulfilled', redeemed_at timestamptz default now())
- **department_scores**(department_id → departments unique, environmental_score numeric, social_score numeric, governance_score numeric, total_score numeric, updated_at)  ← recomputed by triggers
- **org_score_snapshots**(snapshot_date date, overall_esg numeric, environmental numeric, social numeric, governance numeric)  ← daily trend history

---

## 4. Scoring engine (LOCKED formula — implemented as Postgres functions/triggers)

All pillar scores are **0–100**. Weights come from `esg_settings` (defaults E .40 / S .30 / G .30).

**Per department:**

```
environmental_score =
    0.6 * goal_achievement_pct               -- avg over dept goals of clamp(progress,0,100)
  + 0.4 * emissions_efficiency               -- clamp(100 * baseline_intensity / nullif(current_intensity,0), 0, 100)
    ( if no goals/baseline for the dept, default that component to 70 )
    where progress          = clamp(100 * (baseline - current_value) / nullif(baseline - target,0), 0, 100)
          current_intensity = sum(co2e in period) / nullif(employee_count,0)

social_score =
    0.4 * participation_rate                 -- distinct employees w/ an approved CSR participation / employee_count * 100
  + 0.3 * training_completion                -- avg training_completions.completion_pct for the dept
  + 0.3 * diversity_index                    -- normalized 0-100 from diversity_metrics (documented in A3/B1)

governance_score =
    0.5 * policy_ack_rate                     -- acknowledged / required acknowledgements * 100
  + 0.5 * audit_pass_rate                     -- audits with result 'pass' / completed audits * 100
  - 5  * (open compliance issues)
  - 10 * (overdue compliance issues)
    ( clamp final to 0..100 )

department_total = env_weight*environmental + social_weight*social + gov_weight*governance
```

**Organization:**

```
overall_esg = sum(department_total * employee_count) / sum(employee_count)   -- employee-weighted
```

- Recompute a department's row in `department_scores` via triggers on writes to: `carbon_transactions`,
  `employee_participations`, `challenge_participations`, `policy_acknowledgements`, `audits`,
  `compliance_issues`, `training_completions`, `diversity_metrics`, `environmental_goals`, `esg_settings`.
- `org_score_snapshots` gets one row/day via `pg_cron` (for the trend chart).

---

## 5. Feature toggles & required business rules

- **auto_emission_enabled**: when on, inserting a purchase/manufacturing/expense/fleet source record
  (represented via `carbon_transactions` with `is_auto=true` created by a trigger/helper) computes
  `co2e = quantity * emission_factor.factor_kgco2e` using the matching active factor. When off, carbon
  transactions are entered manually.
- **evidence_required_enabled**: a CSR `employee_participation` cannot move to `approved` without a
  non-null `proof_url`. Enforced by a trigger + UI guard.
- **badge_auto_award_enabled**: on any `profiles.xp` or completed-challenge-count change, evaluate all
  badges' `unlock_rule`; auto-insert into a `badge_awards` join and fire a `badge_unlock` notification.
  (Add **badge_awards**(employee_id, badge_id, awarded_at) — owned by Track B / gamification.)
- **compliance_issue**: must always have `owner_id` and `due_date`; a `pg_cron` job flags
  `is_overdue=true` and fires `issue_overdue` notifications for `open` issues past due.
- **reward_redemption**: deduct `points_required` from `profiles.points_balance` (must be sufficient),
  decrement `rewards.stock` (must be > 0), insert `reward_redemptions` — all in one transaction.

---

## 6. AI subsystem (LOCKED)

### 6.1 Two AI surfaces
- **ESG Copilot** — interactive chat, **function-calling** over read-only SQL tools. Needs a
  tool-capable model.
- **AI Insights & Report exec-summary** — single-shot, **context-injection** (we pre-fetch a compact
  JSON snapshot and prompt once). No tools needed.

### 6.2 Model router (implements "use multiple models to dodge rate limits")
Free-tier RPD is the binding limit. Router keeps a prioritized pool, tracks per-model RPM/RPD in
`ai_usage`, skips any model at cap, and on `429` backs off and fails over to the next.

```
COPILOT_POOL (function-calling, priority order):
  gemini-3.1-flash-lite   (15 RPM / 500 RPD)   ← primary
  gemini-3.5-flash        ( 5 RPM /  20 RPD)
  gemini-3-flash          ( 5 RPM /  20 RPD)
  gemini-2.5-flash        ( 5 RPM /  20 RPD)
  gemini-2.5-flash-lite   (10 RPM /  20 RPD)
  → ~580 RPD / ~40 RPM pooled

SINGLE_SHOT_POOL (insights & summaries, no tools):
  gemma-4-31b             (15 RPM / 1500 RPD)  ← primary
  gemma-4-26b             (15 RPM / 1500 RPD)
  → ~3000 RPD / ~30 RPM pooled
```
> Exact model IDs are provided by the human at build time (verify against the live Gemini console).
> Treat the pool as **config** (`api/src/ai/models.ts`), never hardcode a single model in call sites.

### 6.3 Copilot tools (read-only, RLS-scoped via forwarded user JWT)
`get_org_score`, `get_department_scores`, `get_emissions_trend(period)`,
`get_participation_stats(department?)`, `get_compliance_issues(status?)`, `get_policy_ack_rate`,
`get_leaderboard(limit)`. Each = one parameterized SQL query. **Numbers always come from SQL, never
from the model.** Bounded loop: **max 3 tool rounds** per question.

### 6.4 Quota protection
- **Per-user limits** enforced in `api/` before any call: default **10 copilot req/min**, **150/day**.
- **Cache** insights/summaries in `ai_cache` keyed by `sha256(scope + score_snapshot)`.
- **`MOCK_AI=true`** dev flag → router returns canned fixtures; **used for all development/testing**.
- Client debounces copilot input (500 ms) and disables send while pending.

---

## 7. Notifications (LOCKED)
- `notifications` table + SQL fn **`create_notification(p_user, p_type, p_title, p_body, p_payload)`**
  (defined in Phase 00) called from module triggers/service code — no cross-module code coupling.
- **In-app** via Supabase Realtime subscription (Track B Notification Center).
- **Email** via `api/` `POST /email/send` using **Resend** — bonus, gated by `esg_settings.notify_email`.
- Required events: new compliance issue, CSR/Challenge approval decision, policy-ack reminder,
  badge unlock, issue overdue.

---

## 8. Frozen route & nav map (created as stubs in Phase 00 — never edited later)

```
/login                                (public)
/                     Dashboard       org ESG overview            [A: dashboard]
/environmental        + /carbon /goals                            [A]
/social               + /csr /participation /diversity            [B]
/governance           + /policies /audits /compliance             [A]
/gamification         /challenges /leaderboard /rewards /badges    [B]
/reports                                                          [B]
/copilot              ESG Copilot chat                            [A]
/notifications        Notification Center                         [B]
/settings             ESG config, toggles, notification settings  [foundation; A owns weights, B owns notif]
/master               departments, categories, emission-factors, products, policies, badges, rewards
                      (A owns emission-factors/products/goals/policies; B owns categories/badges/rewards)
/admin/users          seeded accounts & roles                     [foundation]
```
Nav sections (sidebar): Dashboard · Environmental · Social · Governance · Gamification · Reports ·
Copilot · Master Data · Settings. Each links to a stub page until its phase fills it in.

---

## 9. Repo layout

```
web/                 React SPA (Firebase Hosting)
  src/app/           shell: router, nav, layout, auth guard   (FROZEN after Phase 00)
  src/lib/           supabaseClient, queryClient, schemas, hooks (FROZEN core)
  src/components/ui/  shadcn components                        (FROZEN core)
  src/modules/<name>/ per-feature code (owned per track)
  src/types/database.ts  generated                            (regenerate on schema change)
api/                 Hono service (Cloud Run)
  src/ai/            model router, tools, prompts, mock fixtures
  src/routes/        /copilot /insights /report-summary /email
supabase/
  migrations/        timestamped SQL (append-only)
  seed/              seed.sql + demo scenario
  functions/         SQL functions (scoring, create_notification)
scripts/verify/      runnable PASS/FAIL verification scripts per phase
docs/                CONVENTIONS, ARCHITECTURE, MASTER_PLAN, TEAMMATE_TASKS
prompts/             phase prompt files
```

---

## 10. Environment variables (names are binding)

**web/ (Firebase Hosting)** — public only: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`.
**api/ (Cloud Run)** — secret: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
`GEMINI_API_KEY`, `RESEND_API_KEY`, `MOCK_AI` (`true`/`false`), `AI_DAILY_LIMIT`, `AI_MINUTE_LIMIT`.
**The human injects these before a phase runs. Never commit or fabricate them.**

---

## 11. Branch & merge strategy (LOCKED — parallel branches, single-branch submission)

The hackathon requires the **submitted code to live in one branch (`main`)**. We reach that via
short-lived parallel branches that merge back:

```
main ──● baseline (frozen, tagged `baseline-v1`)
        ├──────────────▶ track-a   (Lead: environmental, governance, scoring, ai, dashboard)
        └──────────────▶ track-b   (Teammate: social, gamification, notifications, reports)
                                    ▼ integration
main ◀── merge track-a ◀── merge track-b ◀── phase 99 ── SUBMIT (main only)
```

- **Baseline** is built on `main` and **frozen + tagged** before any track starts. It contains every
  shared contract (schema, RLS, shell/router/nav, `lib` core, settings, logging, api skeleton).
- **`track-a`** and **`track-b`** branch from the frozen baseline and run **in parallel**.
- Independence is preserved by **ownership** (see CONVENTIONS): disjoint module folders, append-only
  timestamped migrations, a frozen shell/router/nav — so the eventual merge is near-conflict-free.
- **Merge order:** track-a → main, then track-b → main (rebasing track-b on updated main first),
  resolved during Phase 99. Feature branches are deleted after merge; **the submitted repo is `main`**.
- Commits are made **by the implementing agent** with **human-style messages, no AI trailers/traces**;
  the human reviews and **pushes at their convenience** (CONVENTIONS §2).

## 12. Logging, metrics & observability (LOCKED — for debuggability)

Every phase wires observability; it is part of Definition of Done, not an afterthought.

**api/ (Hono, Cloud Run):**
- **Structured JSON logs** via `pino`. One logger, imported everywhere. Never log secrets or PII
  (no tokens, no emails in full — hash/truncate identifiers).
- **Request-id middleware:** assign/propagate `x-request-id`; every log line carries `request_id`,
  `user_id` (if authed), `route`, `status`, `latency_ms`.
- **AI observability:** the model router logs `model_chosen`, `attempt`, `cache_hit`, `tokens_in/out`
  (if available), `rpd_remaining`, and every `429`/failover hop. Rate-limit rejections log at `warn`.
- **Error taxonomy:** typed errors (`AuthError`, `RateLimitError`, `UpstreamAiError`, `ValidationError`)
  → consistent HTTP codes + a single error-handler middleware that logs stack at `error`.
- **Endpoints:** `GET /health` (liveness, cheap), `GET /metrics` (lightweight in-memory counters:
  requests by route+status, ai calls by model, cache hit rate, error counts). No external APM needed.

**web/ (React):**
- A small `logger` (levels: debug/info/warn/error) gated by `import.meta.env.DEV`; production logs
  warn+ only. Global **error boundary** reports render errors; a `useQuery` error handler logs
  failed calls with the `x-request-id` from the response for cross-referencing api logs.

**Postgres/Supabase:**
- Triggers use `RAISE NOTICE` for score-recompute traces (visible via Supabase logs / MCP `get_logs`).
- Scheduled jobs (overdue/reminders/snapshots) log a one-line summary row each run to an
  `job_runs`(job_name, ran_at, affected_count, note) table for auditability.

**Verify scripts (`scripts/verify/*.ts`):** print structured, greppable output —
`[PHASE x] step … OK/FAIL` lines and a final `RESULT: PASS|FAIL`. This is the debugging surface when
a phase gate fails.

---

## 13. Scope decisions (LOCKED — what we build vs defer)

Decided after the deep-research review. The rule: **complete one loop end-to-end, flawlessly**, over
completing every table. Everything below "Must" is required for the demo and the problem statement.

**Must have (build, must be flawless):** roles/auth + RLS · master data (departments, categories,
emission factors, product ESG profiles, goals, policies, badges, rewards) · carbon transactions
(manual + auto-calc toggle) · environmental goals + dashboard · policies + acknowledgements + reminders ·
audits + compliance issues (owner/due/overdue) + governance dashboard · CSR activities + participation
(proof + approval + points) · diversity metrics · **scoring engine** (pillar → department → org, weighted,
triggered) · challenges + XP + badges + **badge auto-award** + rewards + **reward redemption** +
leaderboards · unified org **Dashboard** · standard **reports** (Env/Social/Gov/Summary) + export
(PDF/CSV/XLSX) + simplified **custom report** (filter dropdowns, not drag-drop) · in-app **notifications**
(realtime) · **AI**: grounded **Insights** (primary, deterministic-fallback) + **ESG Copilot**
(function-calling over read-only SQL, differentiator, never-blank fallback) · **Settings** (weights +
toggles).

**Should have (build if core is green):** training completions (kept minimal — feeds social score, light
UI) · email notifications via Resend (bonus, gated by `notify_email`) · AI executive summary on reports
(gated) · department ESG ranking (folded into dashboard).

**Deferred → `FUTURE_SCOPE.md`:** forecasting, RAG-over-policies, framework mapping (GRI/CSRD), anomaly
detection, benchmarking, bespoke mobile layouts, native push/SMS. Each has an implementation plan there
and a line on the roadmap slide.

**AI de-risking:** Insights is the **must-have** AI surface because it is deterministic-grounded and
cannot embarrass us; Copilot is the **should-have** wow factor with a hard grounding guardrail (§6.3) and
a deterministic fallback so the panel never goes blank on stage. Both run `MOCK_AI=true` in all dev/test.

## 14. Design language

The product's look is **canonical in `docs/DESIGN.md`** ("Grounded Enterprise"): credible enterprise ESG,
**no emojis, no neon/AI-gradient aesthetic, Lucide icons only**, evergreen/slate palette, data-first
charts, numbers as hero. It is binding for every UI prompt. The baseline UI tokens are installed/overridden
once by `prompts/baseline/b00_15_theme_and_design_system.md` (a baseline addendum, since tokens are a
frozen shared file) and both tracks rebase onto it before building pages.

## 15. System diagram

```
                         ┌─────────────────────────────────────────────┐
                         │                  Browser (SPA)               │
                         │   React + Vite + shadcn/ui  (Firebase Host)  │
                         └───────┬───────────────────────────┬─────────┘
                user JWT (RLS)   │                           │  user JWT
              all CRUD / realtime│                           │  AI · email · AI-export
                                 ▼                           ▼
                    ┌────────────────────────┐   ┌──────────────────────────────┐
                    │       SUPABASE         │   │      api/  (Hono, Cloud Run) │
                    │  Postgres 16 + RLS     │   │  request-id · pino · /health │
                    │  Auth · Storage        │◀──│  Gemini model router ────────┼─▶ Gemini / Gemma
                    │  triggers · pg_cron    │   │  copilot SQL tools (RLS)     │      (multi-model pool)
                    │  scoring fns · notify  │   │  Resend email (bonus)        │─▶ Resend
                    └────────────────────────┘   │  ai_usage · ai_cache guard   │
                       ▲   score triggers          └──────────────────────────────┘
                       │   recompute dept + org
        writes ────────┘   (carbon, csr, challenge, policy, audit, issue, …)

  Deploy (agent via terminal/MCP): firebase deploy · gcloud run deploy · apply_migration
```

