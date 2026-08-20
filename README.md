# Sift

**Find the right AI agent for the job.**

Sift is a discovery, comparison, trust, and hiring layer for AI agents on BNB Chain. The repository currently includes the M0 foundation, M1 design system and landing page, and M2 database foundation.

## Current milestone

M2 establishes a versioned Supabase PostgreSQL schema, strict database types, and server-only repositories for agent identities and indexer checkpoints. It does not connect to BNB Chain or populate the database. The M1 landing page remains intentionally independent of database configuration and continues to show an honest unavailable state until the verified marketplace is implemented.

Agent results, blockchain access, authentication, wallet connectivity, and hiring remain deferred to their milestones in the [master ticket](docs/tickets/MASTER-001-sift.md).

## Stack

- Next.js with the App Router
- React and strict TypeScript
- Tailwind CSS v4
- shadcn/ui with Server Components enabled
- ESLint with Next.js Core Web Vitals rules
- Geist through `next/font`
- Supabase PostgreSQL and the official server-side JavaScript client

## Local development

Use Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The static M1 experience does not require database credentials; configuration is validated only when a server-side repository is used.

The database uses the hosted Supabase project connected to GitHub; Docker and a local Supabase stack are not required. For environment setup, migration deployment, security decisions, and linked-project type generation, see [Hosted Supabase database](docs/database.md).

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
supabase/             Hosted deployment configuration and ordered SQL migrations
tests/db/             Focused M2 configuration, mapping, and migration tests
lib/                 Framework-independent utilities and environment access
```

Add feature-specific directories only as their milestones begin. Keep secrets out of source control and never substitute invented agent or blockchain data for unavailable information.
