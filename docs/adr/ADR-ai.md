# ADR: AI Architecture Design

## Context
This document captures the architectural decisions for the AI features of the EcoSphere ESG Platform. The AI subsystem is a key differentiator and must operate reliably under the constraints of the Gemini free-tier limits, specifically the Requests Per Day (RPD) limit.

## 1. AI Surfaces
We expose two distinct AI surfaces:
1. **ESG Copilot**: An interactive chat interface using **Gemini function-calling** over read-only SQL tools. This requires a tool-capable model and operates in a bounded loop with a maximum of **3 tool rounds**.
2. **AI Insights & Report Executive Summary**: A single-shot context-injection approach. We pre-fetch a compact JSON snapshot and use a single prompt. This surface does not use tools.

**Why one agent, not many?** Building a single, excellent AI feature is more testable, explainable, and cheaper to run.
**Why not an autonomous swarm?** Swarms are non-deterministic, hard to reproduce for recorded demos, and quickly exhaust API quotas.

## 2. Grounding Boundary
**Rule:** Every number presented by the AI must come from SQL tools or the injected snapshot. The model is only permitted to phrase and prioritize this data.

A post-validation guardrail will reject any output that introduces numbers not present in the context. If validation fails, the system fails closed to a deterministic template.

**Why?** A hallucinated ESG figure is indefensible. This hard boundary is our strongest defense against hallucinations.

## 3. Model Pools & Router
To overcome the free-tier rate limits, we implement a multi-model router. The router tracks per-model RPM and RPD in the `ai_usage` table. It skips models that have hit their cap and backs off to the next model on `429` (Rate Limit) errors.

### COPILOT_POOL (Function-calling)
- `gemini-3.1-flash-lite` (Primary, 15 RPM / 500 RPD)
- `gemini-3.5-flash` (5 RPM / 20 RPD)
- `gemini-3-flash` (5 RPM / 20 RPD)
- `gemini-2.5-flash` (5 RPM / 20 RPD)
- `gemini-2.5-flash-lite` (10 RPM / 20 RPD)

### SINGLE_SHOT_POOL (Insights & Summaries, no tools)
- `gemma-4-31b` (Primary, 15 RPM / 1.5K RPD)
- `gemma-4-26b` (15 RPM / 1.5K RPD)

**Why?** Most Flash models are capped at 20 RPD on the free tier. Using model pooling and Gemma for single-shot requests turns this demo-killing limit into ample headroom.

## 4. Rate Limiting & Caching
- **Rate Limits:** Per-user limits (`AI_MINUTE_LIMIT` = 10, `AI_DAILY_LIMIT` = 150) are enforced *before* making any external API calls.
- **Caching:** Insights and summaries are cached in the `ai_cache` table, keyed by `sha256(scope + score_snapshot)`.
- **Client-Side:** The client debounces inputs by 500ms to prevent accidental rapid-fire requests.

**Why?** These mechanisms protect the shared free-tier quota and ensure the demo feels instant and repeatable.

## 5. Reliability Contract
Every LLM call follows this lifecycle:
`structured request → schema-validate response → 1 corrective retry → deterministic fallback`

For the Copilot, the fallback provides answers from the raw SQL tool results without utilizing the model.

**Why?** The AI panel must never go blank during a live demo.
