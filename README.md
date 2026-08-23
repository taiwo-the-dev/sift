# Sift

**Find the right AI agent for the job.**

Sift is a discovery, comparison, trust, and hiring layer for AI agents on BNB Chain. The repository includes the M0 foundation, M1 design system and landing page, M2 database foundation, M3 ERC-8004 indexer, M4 discovery marketplace, M5 agent profiles, M6 health/Sift Score implementation, M7 agent comparison, M8 wallet integration, and the M9 ERC-8183 testnet hiring flow.

## Current milestone

M9 lets compatible real indexed agents negotiate a signed quote and enter a five-step BSC Testnet checkout. Sift persists an idempotent pending intent, simulates each exact APEX/ERC-8183 call, requests explicit wallet confirmation, independently verifies receipts and protocol events, resumes pending state after reload, and confirms only a real funded on-chain job.

The hosted catalogue and ordered M4–M6 PostgreSQL migrations are deployed. Real health and withheld-score persistence were validated against BSC Testnet agent `#1883` on 2026-08-22. The additive M9 migration must be deployed before creating a hiring intent. Mainnet hiring, custodial signing, unsupported permission controls, and the M10 dashboard remain intentionally unimplemented.

## Stack

- Next.js with the App Router
- React and strict TypeScript
- Tailwind CSS v4
- shadcn/ui with Server Components enabled
- ESLint with Next.js Core Web Vitals rules
- Geist through `next/font`
- Supabase PostgreSQL and the official server-side JavaScript client
- viem for typed BNB Chain reads
- RainbowKit, wagmi, and TanStack Query for browser wallet state
- Zod for external metadata validation

## Local development

Use Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The landing page and `/discover` use the hosted database at request time. If the catalogue is temporarily unavailable, the landing page degrades honestly and the discovery route presents a retryable error state.

Installed browser wallets work without additional wallet configuration. To enable WalletConnect QR/mobile connections, create a free WalletConnect Cloud project and set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` in `.env.local` and the deployment environment. These public values are exposed to browsers by design; never place private RPC credentials in a `NEXT_PUBLIC_` variable. See [Wallet integration](docs/wallet.md) for networks, fallbacks, setup, security boundaries, and the manual test procedure.

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

Wallet connection states, browser RPC configuration, supported chains, and safe testing are documented in [Wallet integration](docs/wallet.md).

Verified APEX contracts, compatible-agent rules, exact transaction calls, persistence safeguards, faucets, limitations, and the manual testnet demo are documented in [ERC-8183 testnet hiring](docs/hiring.md).

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run test:wallet-ui
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
components/wallet/     M8 provider, responsive control, and state presentation
components/hiring/     M9 mission, review, wallet transaction, and confirmation UI
components/ui/       shadcn/ui components
docs/tickets/        Product specifications and milestone scope
features/discovery/  M4 URL parsing, intent mapping, models, and display fallbacks
features/agents/     M5 profile routing, presentation, links, and domain models
features/health/     M6 endpoint eligibility, safe probing, history, and orchestration
features/scoring/    M6 pure formula, presentation, and recalculation orchestration
features/comparison/ M7 URL validation, domain models, and contextual matching
features/wallet/     M8 public configuration validation and safe presentation
features/hiring/     M9 validation, negotiation, protocol, state, and receipt rules
lib/blockchain/      Shared typed BNB chains plus browser/server hiring clients
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
tests/wallet/         M8 chain, environment, address, and error-mapping coverage
tests/wallet-ui/      M8 rendered connection-state coverage
tests/hiring/         M9 validation, protocol state, receipt, and migration coverage
lib/                 Framework-independent utilities and environment access
```

Add feature-specific directories only as their milestones begin. Keep secrets out of source control and never substitute invented agent or blockchain data for unavailable information.
