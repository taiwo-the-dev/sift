# TICKET-002 — M2 Database Foundation

## Status

Complete

## Depends On

M1 — Design System + Landing Page (Complete)

## Objective

Establish Sift's PostgreSQL persistence foundation through Supabase, including versioned SQL migrations, strict TypeScript database types, environment configuration, and a small repository/service layer that later milestones can use without coupling product UI directly to raw database queries.

## Product Context

Sift cannot present a reliable agent marketplace from transient RPC reads. It needs a normalized, queryable source of truth for indexed agent identity, metadata, services, health, reputation, scores, and synchronization state. This milestone provides that durable foundation without yet indexing blockchain data or displaying marketplace results.

## Scope

- Add the minimal Supabase/PostgreSQL dependencies required for server-side data access.
- Add validated environment variables for the Supabase project URL and appropriate public/server credentials.
- Create ordered, version-controlled SQL migrations under a documented migration directory.
- Create the initial normalized schema for:
  - `agents`;
  - `agent_services`;
  - `agent_health`;
  - `agent_reputation`;
  - `agent_scores`;
  - `sync_state`.
- Include only fields that can be derived from real sources, following the proposed model in `MASTER-001-sift.md`.
- Add primary keys, foreign keys, uniqueness constraints, useful indexes, timestamps, and appropriate check constraints.
- Define cascade behavior deliberately; do not rely on implicit deletion behavior.
- Create generated or faithfully maintained strict TypeScript database types where practical.
- Add separate browser-safe and server-only Supabase client factories if both are genuinely needed; otherwise implement only the server-side client required by this milestone.
- Add feature-oriented repositories/services for agent and sync-state persistence.
- Document local setup, migration application, type generation, and required environment variables.
- Update `.env.example` with names only and safe explanatory comments.

## Out of Scope

- Authentication or user profiles.
- Wallet integration.
- BNB Chain RPC configuration or reads.
- ERC-8004 indexing, metadata fetching, or synchronization scripts.
- Search UI, marketplace pages, agent cards, or profile pages.
- Agent health checks or Sift Score calculation.
- Comparisons, jobs, dashboard data, or hiring flows.
- Supabase seed data containing invented agents or blockchain records.
- Paid Supabase features or infrastructure beyond the free-tier target.

## Technical Requirements

- Use Supabase PostgreSQL and the official supported JavaScript client.
- Keep strict TypeScript enabled; do not introduce `any`-based database access.
- Keep database access behind small repository/service modules in `lib/db`, `features/agents`, or an equivalent feature-oriented structure.
- Do not call raw Supabase queries throughout React components.
- Use server-only boundaries for privileged credentials and database mutation code.
- Keep migration SQL deterministic, reviewable, and safe to apply in order.
- Use snake_case in PostgreSQL and map to application types consistently.
- Add indexes for expected lookup keys such as `(chain_id, agent_id)`, registry address, category, registration time, metadata status, and sync checkpoint keys where justified.
- Ensure `sync_state` supports one checkpoint per chain and registry deployment.
- Treat comparisons, users, saved agents, and jobs as later milestone schemas unless a minimal forward-compatible reference is strictly required; do not create speculative tables.
- Preserve the approximately $0 infrastructure target and document free-tier assumptions.

## Data Integrity Requirements

- Never add fabricated agent, blockchain, reputation, health, score, price, activity, or transaction records.
- Do not add demo or seed agents in this milestone.
- Use database constraints to prevent duplicate chain/registry/agent identities.
- Preserve source identifiers and timestamps without silently rewriting them.
- Represent unavailable optional fields as nullable/unknown rather than invented defaults.
- Do not precompute Sift Scores or reputation values before their source logic exists.

## Security Requirements

- Never commit Supabase secrets, service-role keys, database passwords, or populated local environment files.
- Keep service-role credentials server-only and out of client bundles.
- Define least-privilege Row Level Security behavior for any browser-accessible tables. If browser access is not needed yet, deny it by default.
- Do not expose unrestricted mutation policies.
- Validate data entering repositories even when TypeScript types exist.
- Ensure logs and thrown errors do not reveal credentials or connection strings.

## UX Requirements

- No new production-facing UI is required.
- Existing M0/M1 screens must continue to render and build without requiring a populated database.
- If database configuration is absent during local UI development, fail with a clear configuration message only at the boundary that needs the database; do not break unrelated static pages unnecessarily.

## Acceptance Criteria

- [ ] Required Supabase environment variables are documented and validated.
- [ ] Ordered SQL migrations create all six in-scope tables successfully.
- [ ] Tables include appropriate keys, relationships, constraints, and indexes.
- [ ] Strict TypeScript database types exist and match the schema.
- [ ] Agent and sync-state reads/writes are exposed through repositories/services rather than page components.
- [ ] Privileged credentials are server-only.
- [ ] No fabricated or seed agent data is committed.
- [ ] Existing landing-page behavior remains unchanged.
- [ ] Database setup and migration instructions are documented.
- [ ] Lint, typecheck, relevant tests, and production build pass.

## Testing Requirements

- Add focused unit tests for repository input mapping or validation utilities where logic exists.
- Add an integration test for agent upsert/read behavior and sync checkpoint persistence when an isolated local or test Supabase/PostgreSQL instance is available.
- Test uniqueness and foreign-key behavior through migrations or integration coverage.
- Do not require browser automation because this milestone has no new user flow.
- Run `npm run lint`, the available typecheck command, relevant tests, and `npm run build`.

## Definition of Done

M2 is complete when a fresh documented Supabase/PostgreSQL environment can apply the migrations, the application can access the schema through strict typed repositories, agent and checkpoint persistence is integration-tested where practical, existing UI still builds, no real-data responsibility has leaked into React components, and no M3 indexing work has begun.

## Codex Completion Report

Codex must report:

- Status: PASS or BLOCKED
- Implemented
- Files Changed
- Tests / Validation
- Important Decisions
- Known Issues
- Not Implemented
- Recommended Next Step

## Stop Condition

Do not implement the next milestone automatically.
