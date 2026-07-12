# EcoSphere — ESG Management Platform

An AI-powered ESG Operating System: measure, manage, and improve **Environmental, Social & Governance** performance. Operational data, employee participation, and compliance flow into **one connected ESG score**, gamified for engagement, and explained by an **ESG Copilot**.

Built for the Odoo Hackathon.

## Features

- **Dashboard:** Real-time visibility into overall ESG score and E, S, G pillars. Live AI-generated insight banners highlight lagging departments.
- **Environmental:** Track emissions with automatic CO2e calculations and monitor sustainability goals.
- **Social:** Foster employee engagement with CSR activities, diversity metrics, and compliance training tracking.
- **Governance:** Manage corporate policies with employee acknowledgments, track audits, and monitor compliance issues (overdue tracking).
- **Gamification:** Employees earn points and XP for completing training, acknowledging policies, or participating in CSR events. Automated badges unlock upon reaching XP thresholds.
- **Reports:** Generate executive-ready ESG Summaries via the single-shot Gemma AI, complete with PDF export functionality.
- **ESG Copilot:** Chat with the AI Copilot that uses function-calling to query the live Supabase PostgreSQL database to explain score changes and provide grounded answers.

## Architecture & Tech Stack

- **Frontend:** React + Vite + TypeScript, deployed to **Firebase Hosting**. Uses Tailwind CSS, Radix UI primitives, Recharts for data visualization, and PDFMake for reports.
- **Backend API:** Node.js + Hono, deployed to **Google Cloud Run**. Powers the AI routing and tool execution.
- **Database & Auth:** **Supabase** (PostgreSQL + RLS + Auth). The Gamification and Scoring engines are natively built with PL/pgSQL functions and triggers.
- **AI Router:** Dynamically routes between a tool-calling model pool (Gemini 3.1 Flash/Lite) for the Copilot and a single-shot pool (Gemma 4 31B/26B) for report summaries, with exponential backoff and rate-limiting built-in.

## Pitch & Demo Script

Read the 3-minute pitch run-of-show in [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md).
The narrative demonstrates the full end-to-end loop:
1. Identifying a lagging Governance score via AI Insight.
2. Asking the Copilot *why* it's lagging (grounded explanation).
3. Taking action by resolving an overdue compliance issue.
4. Approving an employee's CSR activity participation.
5. Seeing the overall score move instantly, alongside gamified badge unlocks for the employee.
6. Generating an AI executive summary report.

## Verification & Tests

EcoSphere includes a comprehensive suite of automated verification scripts to ensure the integrity of the database schema, RLS policies, and complex scoring/gamification logic.
Run the smoke tests and the automated demo script (using `tsx`):
```bash
pnpm exec tsx scripts/verify/01_api_smoke.ts
pnpm exec tsx scripts/verify/02_web_smoke.ts
pnpm exec tsx scripts/verify/DEMO_story.ts
```

## Running Locally

1. `pnpm install`
2. Configure `.env` in `web/` and `api/` (refer to `.env.example`).
3. Run the development server for the web app: `pnpm --filter web dev`
4. Run the API: `pnpm --filter api dev`

## Team & Documentation
- **Architecture & Schema:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- **Design System:** [docs/DESIGN.md](docs/DESIGN.md)
- **Demo Script:** [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md)
