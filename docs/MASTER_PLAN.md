# MASTER_PLAN.md — EcoSphere ESG Platform

> The complete, phase-wise execution plan. Pair this with `ARCHITECTURE.md` (names/rules) and
> `CONVENTIONS.md` (agent rules). Each phase has a matching prompt file in `prompts/`.

---

## 1. What we are building

An **AI-powered ESG Operating System**: organizations measure, manage, and improve their
Environmental, Social & Governance performance, with operational data, employee participation,
and compliance flowing into **one connected score**, gamified for engagement, and explained by an
**ESG Copilot**. Full spec coverage (all mandated features) + one deep AI capability.

**Winning formula:** complete the mandatory ERP workflows → connect every module into one ESG
lifecycle → one polished AI capability (Copilot + intelligent insights) → a compelling end-to-end
demo story.

---

## 2. Team, tracks & ownership

| | Lead (you) — **Track A: Spine & Intelligence** | Teammate — **Track B: Engagement & Output** |
|---|---|---|
| Master data | Emission Factors, Product ESG Profiles, Environmental Goals, ESG Policies | Categories, Badges, Rewards |
| Modules | Environmental, Governance | Social, Gamification |
| Cross-cutting | **Scoring engine**, **AI layer (Copilot + Insights)**, Org ESG Dashboard | **Notifications**, **Reports** (+ Custom Report Builder + exports) |
| Backend | `api/` (Cloud Run) — model router, AI endpoints | (uses `api/` only for email/report-summary) |

**Foundation (Phase 00) is built and frozen by the Lead first**, then both tracks run in parallel,
independently, merging cleanly on `main` (see `CONVENTIONS.md` §1).

---

## 3. Dependency graph & sequencing

```
Phase 00 FOUNDATION  (Lead, blocking)
   ├─ scaffold web + api + supabase, pnpm workspace
   ├─ full schema + enums + RLS + seed + storage bucket
   ├─ auth + seeded role accounts + profiles
   ├─ app shell: frozen router + nav + layout + guards
   ├─ shared lib: supabaseClient, queryClient, ui kit, schemas
   ├─ create_notification() fn, esg_settings singleton + Settings shell
   └─ ai_usage / ai_cache tables + api skeleton (Hono) with health route
        │
        ▼  (both tracks start; order within a track is top→down)
 TRACK A (Lead)                         TRACK B (Teammate)
  A1 Environmental                       B1 Social
  A2 Governance                          B2 Gamification
  A3 Scoring engine  ◀───reads all───▶   B3 Notifications
  A4 AI Copilot + Insights               B4 Reports + Custom Builder + export
  A5 Org ESG Dashboard
        │                                     │
        └──────────────┬──────────────────────┘
                       ▼
              Phase 99 INTEGRATION + DEMO
   end-to-end story, seed scenario, polish, video, single-branch cleanup
```

**Why this order holds independence:** every table exists after Phase 00, so A3 (scoring) and B4
(reports) only *read* other modules' tables — no code coupling. Notifications are emitted through
the shared `create_notification()` fn, so any module fires events without touching Track B's code.

---

## 4. Phases in detail

Each phase below maps to `prompts/<id>.md`, which contains the executable instructions, tests, mock
scripts, ASK-FIRST checklist, and Definition of Done.

### Phase 00 — Foundation (Lead) → `prompts/00-foundation.md`
Scaffold the monorepo; implement the **entire schema** (§3 of ARCHITECTURE) with enums, RLS, and
seed data; Supabase Auth + seeded role accounts + `profiles`; the **frozen** app shell (router, nav,
layout, auth guard); shared `lib` (client, query client, Zod schemas, UI kit); `esg_settings`
singleton + a Settings page shell; `create_notification()`; `ai_usage`/`ai_cache`; the Hono `api/`
skeleton with a health route and JWT middleware. **DoD:** app runs, all three roles log in, every
nav route renders a stub, schema + seed load, `api` `/health` returns ok.

### Phase A1 — Environmental (Lead) → `prompts/A1-environmental.md`
Master data CRUD for Emission Factors, Product ESG Profiles, Environmental Goals. Carbon Transactions
(manual entry + **auto-calc** when `auto_emission_enabled`). Department carbon tracking + goal
progress. Environmental dashboard (emissions trend, by-department, goal gauges). **DoD:** entering a
source record with auto-calc on creates a carbon transaction with correct `co2e`; goal progress shows.

### Phase A2 — Governance (Lead) → `prompts/A2-governance.md`
ESG Policies CRUD + Policy Acknowledgements (with reminders hook). Audits (schedule → complete →
result). Compliance Issues (owner + due date + **overdue flagging** via cron). Governance dashboard.
**DoD:** an overdue issue auto-flags and fires `issue_overdue`; ack rate reflects in governance score.

### Phase A3 — Scoring engine (Lead) → `prompts/A3-scoring-engine.md`
Postgres functions implementing the **§4 formula**; triggers on all contributing tables to recompute
`department_scores`; org overall via employee-weighted average; daily `org_score_snapshots` via cron.
Unit tests for the math. **DoD:** any transaction ripples to `department_scores` and the org score;
weights configurable from Settings change the totals live.

### Phase A4 — AI Copilot + Insights (Lead) → `prompts/A4-ai-copilot.md`
`api/` model router (COPILOT_POOL + SINGLE_SHOT_POOL, `ai_usage` limits, `429` failover, `MOCK_AI`).
Copilot function-calling over the read-only SQL tools (RLS-scoped). AI Insights cards
(score-drop reason + recommendation, cached). AI exec-summary endpoint for reports. `web/` Copilot
chat page + Insights components. **DoD:** copilot answers "why is our score low / which dept needs
attention" using real SQL numbers; insights render; quota-safe via mock + cache.

### Phase A5 — Org ESG Dashboard (Lead) → `prompts/A5-org-dashboard.md`
The landing dashboard: **ESG score gauge**, carbon trend, department ranking, pillar breakdown, plus
an AI Insight banner and quick links. Realtime score tiles. **DoD:** dashboard tells the whole story
at a glance and updates when underlying data changes.

### Phase B1 — Social (Teammate) → `prompts/B1-social.md`
CSR Activities CRUD. Employee Participation (proof upload to `proofs/`, approval flow, points award,
**evidence-required** enforcement). Diversity metrics + training completion capture. Social dashboard.
**DoD:** approving a participation awards points and moves the social score; evidence rule blocks
approval without a file when enabled.

### Phase B2 — Gamification (Teammate) → `prompts/B2-gamification.md`
Categories/Badges/Rewards master data. **Challenge lifecycle state machine** (draft→active→under
review→completed / archived). Challenge Participation + XP award. **Badge auto-award engine**
(`unlock_rule` evaluation + `badge_unlock` notification). **Reward redemption** (points + stock,
transactional). Leaderboards. **DoD:** completing a challenge awards XP → auto-unlocks a badge;
redeeming a reward deducts points + stock atomically.

### Phase B3 — Notifications (Teammate) → `prompts/B3-notifications.md`
Notification Center UI (Realtime subscription, read/unread, filters). Notification Settings.
`api/` `POST /email/send` via Resend (bonus, gated by `notify_email`). Wire the five required event
types (calls already emitted by modules via `create_notification()`). **DoD:** all five event types
appear in-app in real time; email path works when enabled.

### Phase B4 — Reports (Teammate) → `prompts/B4-reports.md`
Environmental / Social / Governance / ESG Summary reports. **Custom Report Builder** (filters: dept,
date range, module, employee, challenge, ESG category). Exports **PDF (pdfmake) / Excel+CSV
(SheetJS)**. **AI exec-summary** at the top (from `api/` `/report-summary`). **DoD:** build a filtered
report and export all three formats; AI summary appears.

### Phase 99 — Integration + Demo (both) → `prompts/99-integration-demo.md`
Seed the **demo scenario** (company → departments → CSR → carbon → policy → compliance issue →
challenge → score update → AI explains → report download). Full end-to-end verify script. Mobile
responsive pass. README + solution video script. **Single-branch cleanup** and push-to-prod check.
**DoD:** the 3-minute story runs flawlessly on prod (Firebase Hosting + Cloud Run + Supabase).

---

## 5. The demo story (what we rehearse toward)

```
Company is set up → departments created → employees join CSR activities (upload proof, get approved)
→ purchase/fleet data enters → carbon transactions auto-calculate → policies acknowledged →
a compliance issue is raised (owner + due date) → an employee completes a challenge → XP awarded →
badge auto-unlocks → department & org ESG scores update live → the Copilot explains WHY a department
dropped and recommends actions → a manager downloads the AI-summarized ESG report.
```
Judges remember stories, not screens. Every phase's verify script is a rehearsal of one story beat.

---

## 6. Testing strategy (per `CONVENTIONS.md` §5)

- **Unit (Vitest):** scoring math, model router selection/failover, XP/points, badge unlock eval,
  report filter logic, redemption transaction guards.
- **Integration:** against local/preview Supabase — RLS, triggers, auto-calc, approval→score ripple.
- **Verify scripts (`scripts/verify/*.ts`):** one per phase, prints `PASS`/`FAIL`; Phase 99 chains
  them into the full story.
- **AI:** `MOCK_AI=true` throughout development; real Gemini only in explicit integration/demo runs.

---

## 7. Deployment & environments

- **Firebase Hosting** ← `web/` (`VITE_*` env only). **Agent-driven**: `pnpm --filter web build` then
  `firebase deploy` from the terminal (`integration/i_05`).
- **Cloud Run** ← `api/` (Dockerfile). **Agent-driven**: `gcloud run deploy`; all secrets in Cloud Run env.
- **Supabase** — one project; migrations via MCP `apply_migration` / `supabase db push`; `pg_cron` for
  overdue/reminders/snapshots. The agent has terminal/MCP access to all three, so it goes from project
  creation to live deploy itself.
- **Branch model (ARCHITECTURE §11):** baseline on `main` (tagged `baseline-v1`) → parallel
  `track-a` / `track-b` → merged back to `main`; **submission is single-branch `main`**.
- **Observability (ARCHITECTURE §12):** structured `pino` logs + request-ids + `/health` + `/metrics`
  in `api`; error boundary + gated logger in `web`; `RAISE NOTICE` + `job_runs` table in Postgres.
- Keep every branch green (CI: `pnpm typecheck` + `pnpm build` + `pnpm test`).

## 7a. Prompt library layout (how the build is driven)

```
prompts/
  README.md            runbook: order, locked decisions, phase map
  CONVENTIONS.md       binding rules for every prompt (commits, logging, tests, DoD, status report)
  baseline/            b00_01 … b00_14 + b00_15 (theme/design tokens addendum) + b00_E2E gate
                       ← LEAD executes first, then freezes/re-tags baseline-v1
  track_a/             phase folders A1..A5, each atomic sub-tasks + E2E gate  ← LEAD, branch track-a
  track_b/             phase folders B1..B4, each atomic sub-tasks + E2E gate  ← TEAMMATE, branch track-b
  integration/         i_01 merge · i_02 seed · i_03 story · i_04 design QA · i_05 deploy
                       (Firebase+Cloud Run+Supabase) · i_06 readme+video · i_07 submission gate
```
Supporting canon: `docs/DESIGN.md` (visual language, binding for UI), `docs/ARCHITECTURE.md` §13 (scope:
Must/Should/deferred), `docs/FUTURE_SCOPE.md` (deferred features + plans), §15 (system diagram).
Each `*.md` is **self-contained** and run in a **fresh chat**: it opens with "read `CONVENTIONS.md`
+ `docs/ARCHITECTURE.md` first", does **one** atomic task, and ends with a hard verification + status
report. A phase's `E2E` gate must pass before the next phase starts.

---

## 8. Risk register & cut-line

| Risk | Mitigation |
|---|---|
| Gemini free-tier RPD (20 on most models) | Multi-model router + Gemma single-shot + caching + `MOCK_AI` in dev |
| Two committers on one branch | Folder/migration ownership; frozen shell; rebase-before-push |
| Scoring feels disconnected | Triggers recompute live; verify script proves the ripple |
| Scope overrun | Cut-line below — ship the core story first |
| AI hallucinating numbers | Numbers only from SQL tools; model only phrases them |

**Cut-line (ship in this order if time is ever tight):** Core CRUD + auto-calc + scoring + org
dashboard + Copilot (the story) **first**; then notifications, custom report builder, email, diversity
metrics, embeddings-RAG as polish. (With AI agents this should all land, but the order de-risks.)

---

## 9. Judging alignment (why this wins)

- **Completeness:** every mandated feature (toggles, redemption+stock, notifications, custom report
  builder, overdue flagging, challenge lifecycle) is an explicit phase with a DoD.
- **Data model:** documented, normalized, RLS-secured — visible engineering rigor.
- **Integration:** the live scoring ripple is the differentiator most teams skip.
- **AI:** one deep, grounded Copilot (no hallucinated numbers) + executive insights.
- **Demo:** a rehearsed story, on real prod infra.
