# Sift

**Find the right AI agent for the job.**

Sift is a discovery, comparison, trust, and hiring layer for AI agents on BNB Chain. The repository includes the M0 foundation, M1 design system and landing page, M2 database foundation, M3 ERC-8004 indexer, M4 discovery marketplace, M5 agent profiles, M6 health/Sift Score implementation, and the M7 agent comparison experience.

## Current milestone

M7 adds reusable selection controls and a server-rendered `/compare` route for two to four canonical agent identities. Shareable URLs preserve the optional goal, one bounded repository operation loads real M6 evidence in bulk, and a documented deterministic rule highlights a contextual match only when the available evidence justifies one.

The hosted catalogue and ordered M4–M6 PostgreSQL migrations are deployed. Real health and withheld-score persistence were validated against BSC Testnet agent `#1883` on 2026-08-22. M7 adds no schema migration and was browser-validated against real hosted catalogue identities. Authentication, wallet connectivity, and hiring remain deferred to their milestones in the [master ticket](docs/tickets/MASTER-001-sift.md).

## Stack

- Next.js with the App Router
- React and strict TypeScript
- Tailwind CSS v4
- shadcn/ui with Server Components enabled
- ESLint with Next.js Core Web Vitals rules
- Geist through `next/font`
- Supabase PostgreSQL and the official server-side JavaScript client
- viem for typed BNB Chain reads
- Zod for external metadata validation

## Local development

Use Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page and `/discover` use the hosted database at request time. If the catalogue is temporarily unavailable, the landing page degrades honestly and the discovery route presents a retryable error state.

The database uses the hosted Supabase project connected to GitHub; Docker and a local Supabase stack are not required. For environment setup, migration deployment, security decisions, and linked-project type generation, see [Hosted Supabase database](docs/database.md).

Verify or operate the M3 chain reader with:

```bash
npm run index:smoke
npm run index:agents
npm run sync:agents
```

For verified deployments, RPC configuration, metadata safeguards, GitHub Actions setup, and recovery behavior, see [Sift Indexer operations](docs/indexer.md).

After the M6 migration is deployed, verify and run bounded health/scoring batches with:

```bash
npm run check:smoke
npm run score:smoke
npm run check:agents
npm run score:agents
```

The formula, evidence audit, endpoint safety rules, scheduler, Featured rule, and deployment sequence are documented in [Agent health and Sift Score](docs/scoring.md).

Comparison URL state, bounded data loading, supported fields, Unknown handling, and the contextual match rule are documented in [Agent comparison](docs/comparison.md).

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Structure

```text
app/                 App Router entry points and global styles
components/layout/   Shared application shell components
components/landing/  M1 landing-page sections
components/discovery/ M4 search, filters, cards, pagination, and states
components/agents/   M5 profile sections, navigation, copy, and fallback states
components/scoring/  M6 accessible score summary and evidence breakdown
components/comparison/ M7 selection controls, navigation state, and comparison UI
components/ui/       shadcn/ui components
docs/tickets/        Product specifications and milestone scope
features/discovery/  M4 URL parsing, intent mapping, models, and display fallbacks
features/agents/     M5 profile routing, presentation, links, and domain models
features/health/     M6 endpoint eligibility, safe probing, history, and orchestration
features/scoring/    M6 pure formula, presentation, and recalculation orchestration
features/comparison/ M7 URL validation, domain models, and contextual matching
lib/db/              Server-only client, strict schema types, validation, repositories
lib/indexer/         ERC-8004 configuration, RPC, metadata, persistence, and sync logic
scripts/             Server-only operational command entry points
supabase/             Hosted deployment configuration and ordered SQL migrations
tests/db/             Focused M2 configuration, mapping, and migration tests
tests/indexer/        M3 unit and integration coverage
tests/discovery/      M4 query, repository, formatting, and migration coverage
tests/agents/         M5 route, link, presentation, repository, and migration coverage
tests/health/         M6 endpoint, SSRF, repository, runner, and transition coverage
tests/scoring/        M6 formula, persistence, Featured, and presentation coverage
tests/comparison/     M7 selection, matching, and bounded repository coverage
lib/                 Framework-independent utilities and environment access
```

Add feature-specific directories only as their milestones begin. Keep secrets out of source control and never substitute invented agent or blockchain data for unavailable information.
