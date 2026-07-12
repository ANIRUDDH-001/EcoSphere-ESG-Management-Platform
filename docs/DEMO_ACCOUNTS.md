# Demo Accounts

The following seeded accounts can be used to log in and interact with the application. Each account is pre-configured with a specific role and department to demonstrate Row-Level Security (RLS) boundaries and role-based capabilities.

## Credentials
All accounts use the same development password:
**Password:** `password123`

## Available Roles

| Role | Email | Department | Capabilities |
| --- | --- | --- | --- |
| **Admin** | `admin@ecosphere.test` | None | Full access. Can view and modify all master reference data, config settings, cross-department data, and assign department heads. |
| **Manager** | `manager@ecosphere.test` | Engineering (Dept Head) | Can view department-wide activities, approve/reject employee participations, view audits and compliance issues for their department. |
| **Employee** | `employee@ecosphere.test` | Engineering | Can view own participations, log activities, and read master reference data (policies, badges, categories). |
| **Employee 2** | `emp2@ecosphere.test` | Marketing | Same capabilities as Employee, but isolated to Marketing department. |
| **Employee 3** | `emp3@ecosphere.test` | HR | Same capabilities as Employee, but isolated to HR department. |

*Note: These accounts are created idempotently via `scripts/seed_auth.ts` on initialization.*
