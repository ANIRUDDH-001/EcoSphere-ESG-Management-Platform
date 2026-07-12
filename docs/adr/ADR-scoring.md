# ADR: Scoring Engine Design of Record

## Context

The scoring engine is the core integration point of the EcoSphere ESG Platform (A3 phase). Every operational write translates into a live ESG score. This document locks down the scoring formula and design decisions, acting as the single source of truth for the subsequent implementation phases (a3_01 through a3_07).

## Formula (From ARCHITECTURE.md §4)

All pillar scores are scaled 0–100. Pillar weights are derived from `esg_settings` (defaults: Env 40%, Soc 30%, Gov 30%).

**Environmental Score**
```sql
environmental_score =
    0.6 * goal_achievement_pct               -- avg over dept goals of clamp(progress, 0, 100)
  + 0.4 * emissions_efficiency               -- clamp(100 * baseline_intensity / nullif(current_intensity, 0), 0, 100)
    
    where progress          = clamp(100 * (baseline - current_value) / nullif(baseline - target, 0), 0, 100)
          current_intensity = sum(co2e in period) / nullif(employee_count, 0)
```
*(If no goals/baseline exist for the department, components default to 70)*

**Social Score**
```sql
social_score =
    0.4 * participation_rate                 -- distinct employees with an approved CSR participation / employee_count * 100
  + 0.3 * training_completion                -- avg training_completions.completion_pct for the dept
  + 0.3 * diversity_index                    -- normalized 0-100 from diversity_metrics
```

**Governance Score**
```sql
governance_score =
    0.5 * policy_ack_rate                    -- acknowledged / required acknowledgements * 100
  + 0.5 * audit_pass_rate                    -- audits with result 'pass' / completed audits * 100
  - 5  * (open compliance issues)
  - 10 * (overdue compliance issues)
```
*(Final score clamped to 0..100)*

**Aggregations**
```sql
department_total = env_weight*environmental + social_weight*social + gov_weight*governance
overall_esg = sum(department_total * employee_count) / sum(employee_count)   -- employee-weighted
```

## Locked Decisions & Reasoning

### 1. Scoring Period
- **Decision**: The scoring period for emissions intensity and CSR participation rate is a **rolling 12 months** (configurable later). 
- **Reasoning**: This provides stability and averages out seasonal effects. It also matches the a1_07 window.

### 2. Pillar Scores Computation
- **Decision**: Computed by pure SQL functions, one per pillar, outputting 0–100 exactly per ARCHITECTURE §4.
- **Reasoning**: Ensures one authoritative, unit-testable implementation rather than duplicating logic across the application.

### 3. Diversity Index Normalization
- **Decision**: Derived from `diversity_metrics` and blended into a 0–100 score in equal thirds:
  - `gender_ratio`: closeness to 0.5 mapped to 0..100.
  - `avg_tenure`: mapped against predefined buckets.
  - `training_hours`: measured against a target.
- **Coordination**: Meaning of these fields must be coordinated with Track B/B1.
- **Reasoning**: Diversity metrics must produce a defensible, objective number rather than a subjective evaluation.

### 4. Missing-Data Defaults
- **Decision**: 
  - No goals/baseline → env efficiency & goal components default to `70`.
  - No diversity rows → `diversity_index` defaults to `70`.
  - No completed audits → `audit_pass_rate` defaults to `100` (with an explanatory note).
- **Reasoning**: A fresh organization or department shouldn't score a 0 out of the gate. Defaults are neutral-positive and clearly documented.

### 5. Recompute Strategy
- **Decision**: Uses **synchronous triggers** to recompute scores immediately, rather than a background job queue.
- **Reasoning**: For the demo and hackathon data volumes, trigger latency is negligible. The main value proposition of the demo is seeing the score move in real-time.
- **Why Not Alternatives (Job Queue)**: Adds infrastructure complexity and non-determinism with no tangible benefit for this scale.

### 6. SQL Function Contract
- **Decision**: All functions must be defined as `SECURITY DEFINER`, with `search_path=public`, returning `numeric`.
  - `fn_environmental_score(p_dept uuid)`
  - `fn_social_score(p_dept uuid)`
  - `fn_governance_score(p_dept uuid)`
  - `fn_department_total(p_dept uuid)` (reads weights from `esg_settings`)
  - `fn_recompute_department_score(p_dept uuid)` (upserts into `department_scores`)
  - `fn_recompute_org_score()` (upserts today's `org_score_snapshots`)
- **Reasoning**: Standardizes the interface, ensures security rules are bounded, and encapsulates the logic strictly within the database layer.
