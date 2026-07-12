# FUTURE_SCOPE.md — deliberately deferred, with implementation plans

> These were evaluated (see the deep-research review) and **cut from the hackathon build to protect the
> core end-to-end demo under time pressure**. Each is kept here with a concrete plan so the roadmap is
> credible to judges ("we know exactly how we'd build this next") and so nothing is silently dropped.
> Say this in the demo: the platform is architected so each of these is an additive module, not a rewrite.

## Cut / deferred and why

| Feature | Why deferred | Risk if we'd built it now |
|---|---|---|
| ESG forecasting (predict next-quarter score/emissions) | Needs trend history we won't have in a 2-day demo; ML tuning time | Time sink, weak with sparse data |
| RAG copilot over policy PDFs | Vector store + ingestion + eval loop; our copilot already answers from live SQL | Scope creep on the AI feature that's already the differentiator |
| Compliance framework mapping (GRI / CSRD / SASB) | Large domain data + templates; not core to the score loop | High effort, low demo payoff |
| Anomaly detection on data submissions | Needs baselines/volume to be meaningful | Fragile without data |
| Department vs industry benchmarking | Requires external benchmark data we don't have | Placeholder-y, judges see through it |
| Dedicated mobile-optimized layouts | App is responsive via Tailwind; bespoke mobile UX is polish | Time better spent on core polish |
| Native push / SMS notifications | In-app realtime + email (bonus) cover the requirement | Extra infra, no added demo value |

## Implementation plans (roadmap slides / README "Future scope")

1. **ESG Forecasting** — nightly `pg_cron` job writes to a `score_forecasts` table using a simple
   linear/Holt trend over `org_score_snapshots` + `carbon_transactions`; surface as a dashed
   continuation on the existing `TrendLine`. Later: swap the estimator for a small regression without
   touching the UI contract. Est: ~1.5 days.
2. **RAG policy copilot** — store `esg_policies.body` embeddings in Supabase `pgvector`; add a
   `search_policies(query)` copilot tool alongside the existing SQL tools; the grounding guardrail
   already forces citations, so answers cite real policy text. Additive to `api/src/ai`. Est: ~2 days.
3. **Framework mapping** — a `framework_requirements` master table + a mapping join from
   policies/audits/metrics; a "coverage %" report per framework reusing the report engine (`B4`). Est: ~2 days.
4. **Anomaly detection** — a `pg_cron` job computing rolling mean/stddev per department metric, flagging
   outliers into `notifications` (type reuse) and a dashboard "needs attention" strip. Est: ~1 day.
5. **Benchmarking** — seed anonymized peer bands; add a comparison layer to the score gauge. Gated
   behind a settings toggle. Est: ~1.5 days.
6. **Mobile optimization** — audit each module page at `sm`/`md`, add a bottom-nav variant of the shell;
   no data changes. Est: ~1 day.

## Architecture note

The system is a **modular monolith on a managed data plane** (Supabase Postgres + RLS is the security
boundary; one Hono service on Cloud Run for AI/email/exports; React SPA on Firebase Hosting). Every
future item above is a new module folder + append-only migration + optional `api` route — the same
seams the two hackathon tracks already use. No microservice decomposition is needed at this scale; if
load ever demanded it, the AI router and export/report generation are the natural first extractions.
See `ARCHITECTURE.md` §11–§14 and the diagram there.
