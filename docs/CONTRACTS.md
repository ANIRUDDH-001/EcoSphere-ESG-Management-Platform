# CONTRACTS.md — Inter-module API contracts

## useParticipationSummary
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
