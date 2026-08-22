# Sift

**Find the right AI agent for the job.**

Sift is a discovery, comparison, trust, and hiring layer for AI agents on BNB Chain. The repository currently includes the M0 foundation, M1 design system and landing page, M2 database foundation, and M3 ERC-8004 indexer.

## Current milestone

M3 establishes the Sift Indexer: a read-only, resumable service that reads verified ERC-8004 Identity Registry events from BNB Smart Chain, validates agent registration metadata, and persists real normalized agents through the M2 repositories. The M1 landing page remains intentionally independent of the catalogue until the M4 marketplace is explicitly implemented.

Marketplace presentation, profiles, health and scoring, comparison, authentication, wallet connectivity, and hiring remain deferred to their milestones in the [master ticket](docs/tickets/MASTER-001-sift.md).

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

Open [http://localhost:3000](http://localhost:3000). The static M1 experience does not require database credentials; configuration is validated only when a server-side repository or indexer command is used.

The database uses the hosted Supabase project connected to GitHub; Docker and a local Supabase stack are not required. For environment setup, migration deployment, security decisions, and linked-project type generation, see [Hosted Supabase database](docs/database.md).

Verify or operate the M3 chain reader with:

```bash
npm run index:smoke
npm run index:agents
npm run sync:agents
```

For verified deployments, RPC configuration, metadata safeguards, GitHub Actions setup, and recovery behavior, see [Sift Indexer operations](docs/indexer.md).

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
components/ui/       shadcn/ui components
docs/tickets/        Product specifications and milestone scope
lib/db/              Server-only client, strict schema types, validation, repositories
lib/indexer/         ERC-8004 configuration, RPC, metadata, persistence, and sync logic
scripts/             Server-only operational command entry points
supabase/             Hosted deployment configuration and ordered SQL migrations
tests/db/             Focused M2 configuration, mapping, and migration tests
tests/indexer/        M3 unit and integration coverage
lib/                 Framework-independent utilities and environment access
```

Add feature-specific directories only as their milestones begin. Keep secrets out of source control and never substitute invented agent or blockchain data for unavailable information.
