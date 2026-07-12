# EcoSphere — ESG Management Platform

An AI-powered ESG Operating System: measure, manage, and improve **Environmental, Social &
Governance** performance. Operational data, employee participation, and compliance flow into **one
connected ESG score**, gamified for engagement, and explained by an **ESG Copilot**.

Built for the Odoo Hackathon. Single-branch (`main`) submission.

## Modules
- **Environmental** — emission factors, carbon accounting (with auto-calc), sustainability goals
- **Social** — CSR activities, participation (proof + approval), diversity & training
- **Governance** — policies + acknowledgements, audits, compliance issues (owner/due/overdue)
- **Gamification** — challenge lifecycle, XP, auto-awarded badges, reward redemption, leaderboards
- **Reports** — Environmental / Social / Governance / ESG Summary + Custom Builder + PDF/Excel/CSV
- **AI** — ESG Copilot (function-calling, grounded in SQL) + AI Insights + report exec-summaries

## Stack
React + Vite + TS (Vercel) · Node + Hono (Cloud Run) · Supabase (Postgres + RLS + Auth + Storage +
cron) · Gemini multi-model router + Gemma for single-shot.

```
web/        React SPA            → Vercel
api/        Hono service (AI)    → Cloud Run
supabase/   migrations · seed · RLS · SQL functions
scripts/    verification scripts (PASS/FAIL)
docs/       CONVENTIONS · ARCHITECTURE · MASTER_PLAN · TEAMMATE_TASKS
prompts/    phase-by-phase build prompts
```

## Where to start
1. `docs/ARCHITECTURE.md` — canonical names, schema, scoring formula, AI design (**binding**).
2. `docs/MASTER_PLAN.md` — the phase-wise plan and the demo story.
3. `docs/CONVENTIONS.md` — the rules every contributor/agent follows.
4. `prompts/00-foundation.md` — build this first, then Track A (`A1..A5`) and Track B (`B1..B4`)
   in parallel, finishing with `prompts/99-integration-demo.md`.

## Team
- **Lead — Track A:** Environmental, Governance, Scoring engine, AI layer, Org dashboard.
- **Teammate — Track B:** Social, Gamification, Notifications, Reports (see `docs/TEAMMATE_TASKS.md`).

## Local dev (once Phase 00 lands)
```
pnpm install
pnpm --filter web dev          # Vite dev server
pnpm --filter api dev          # Hono service (MOCK_AI=true for AI work)
pnpm typecheck && pnpm build   # must be green before every push
```
> Secrets live only in Cloud Run env (Gemini/Resend/service role). `web` uses only `VITE_*`.
> The Supabase connection is injected by the team before a build phase — never committed.
