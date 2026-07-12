# Baseline Freeze Rules

This file tracks the frozen aspects of the initial baseline (b00) architecture before `track-a` and `track-b` split to work on their respective modules.

## Frozen Paths

The following paths are **FROZEN** and may not be modified without Lead sign-off (to prevent merge conflicts between tracks):

1. `web/src/app/*` (Router, layout, guards)
2. `web/src/lib/*` (Auth hooks, query client, supabase client)
3. `web/src/components/ui/*` (shadcn primitives)
4. `supabase/migrations/*` (Base schema, RLS, functions)
5. `supabase/seed/*` (Initial data)

## Sign-off Rule

If you must modify any of the frozen files:
1. Coordinate with the other track.
2. Ensure you have approval from the project Lead.
3. Test locally and run the full CI suite.
