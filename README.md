# Sift

**Find the right AI agent for the job.**

Sift is a discovery, comparison, trust, and hiring layer for AI agents on BNB Chain. This repository currently contains the M0 application foundation only.

## Current milestone

M0 establishes the repository, application shell, and development tooling. Agent discovery, blockchain access, authentication, wallet connectivity, and hiring are intentionally deferred to their milestones in the [master ticket](docs/tickets/MASTER-001-sift.md).

## Stack

- Next.js with the App Router
- React and strict TypeScript
- Tailwind CSS v4
- shadcn/ui with Server Components enabled
- ESLint with Next.js Core Web Vitals rules
- Geist through `next/font`

## Local development

Use Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

M0 requires no environment variables. `.env.example` will grow only when later milestones introduce real integrations.

## Validation

```bash
npm run lint
npm run typecheck
npm run build
```

## Structure

```text
app/                 App Router entry points and global styles
components/layout/   Shared application shell components
components/ui/       shadcn/ui components
docs/tickets/        Product specifications and milestone scope
lib/                 Framework-independent utilities and environment access
```

Add feature-specific directories only as their milestones begin. Keep secrets out of source control and never substitute invented agent or blockchain data for unavailable information.
