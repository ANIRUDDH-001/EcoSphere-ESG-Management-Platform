# Application Contracts

This document serves as the interface contract boundary between architectural tracks.
It defines the exact shape of shared APIs, database hooks, and common modules.

## Track A → Track B: Score Reads

The realtime scoring hooks exposed by Track A for dashboard and reporting consumption.
These are stable implementations built on top of Supabase and TanStack Query.

**Location**: `web/src/lib/hooks/scores.ts`

### Signatures

```ts
// Returns the single most recent organizational score snapshot
export function useOrgScore(): {
  data?: {
    overall: number;
    environmental: number;
    social: number;
    governance: number
  }
};

// Returns the live row of current scores per department
export function useDepartmentScores(): {
  data?: DepartmentScoreRow[]
};

// Returns chronological org snapshots over the trailing specified days
export function useScoreTrend(days: number): {
  data?: OrgScoreSnapshot[]
};

// Subscribes to realtime updates on department_scores and org_score_snapshots.
// Pass a callback to trigger standard React Query cache invalidation (e.g. invalidateQueries).
// Returns the unsubscribe teardown function.
export function subscribeScores(onChange: () => void): () => void;
```

## Report exec-summary (A4→B4)

The executive summary generator exposed by Track A (AI endpoints) for report consumption by Track B4.

**Endpoint**: `POST /report-summary`

### Request Payload
```ts
{
  title: string,
  period: string,
  metrics: Record<string, number|string>,
  highlights?: string[]
}
```

### Response Shape
```ts
{
  summary: string,
  cached: boolean,
  fallback: boolean
}
```

## Track B → Track A: useParticipationSummary
Consumed by: Track A Org Dashboard (`web/src/modules/dashboard`)
Published by: Track B Social (`web/src/modules/social/hooks.ts`)

### Type Signature
```typescript
export interface ParticipationSummary {
  participationRate: number; // 0-100 (distinct employees w/ an approved CSR participation / employee_count * 100)
  approvedCount: number;      // total count of unique employees who have completed at least one approved participation
  totalEmployees: number;     // sum of active department employee counts
  recentByDept: { department_id: string; name: string; count: number }[]; // list of active departments sorted by approved participations
}

export function useParticipationSummary(): UseQueryResult<ParticipationSummary, Error>;
```

## Track B → Track A: useLeaderboard
Consumed by: Track A Org Dashboard (`web/src/modules/dashboard`)
Published by: Track B Gamification (`web/src/modules/gamification/hooks.ts`)

### Type Signature
```typescript
export interface LeaderboardEntry {
  id: string;
  full_name: string;
  email: string;
  xp: number;
  points_balance: number;
  department_id: string | null;
  department?: { name: string } | null;
}

export function useLeaderboard(limit?: number): UseQueryResult<LeaderboardEntry[], Error>;
```
