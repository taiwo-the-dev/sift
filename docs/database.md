# Database development

M2 uses Supabase PostgreSQL as Sift's persistence layer. The schema is migration-driven, browser access is denied by default, and no seed file exists because Sift must never present invented agent or blockchain records.

## Prerequisites

- Node.js 20.9 or newer
- npm
- Docker Desktop or another Docker-compatible runtime for the local Supabase stack

The Supabase CLI is pinned as a development dependency, so use the repository scripts instead of a globally installed CLI.

## Local setup

Install dependencies and start the local stack:

```bash
npm install
npm run db:start
```

`db:start` creates the local services and applies every migration under `supabase/migrations/` in filename order. To rebuild the local database exclusively from the checked-in migrations:

```bash
npm run db:reset
```

Copy the environment template:

```bash
cp .env.example .env.local
```

Run `npx supabase status -o env` to inspect local credentials. Set `SUPABASE_URL` to the local API URL. Set `SUPABASE_SECRET_KEY` to the local secret/server credential (the CLI may label a legacy local value `SERVICE_ROLE_KEY`). Never commit `.env.local` or place this value in a `NEXT_PUBLIC_` variable.

The landing page does not access the database and continues to work without these variables. Missing or invalid values throw a focused configuration error only when a database repository is created.

Stop the local services when they are not needed:

```bash
npm run db:stop
```

## Schema

The initial migration creates six tables:

| Table | Responsibility |
| --- | --- |
| `agents` | Canonical chain/registry/agent identity and last verified normalized metadata |
| `agent_services` | Multiple service declarations associated with an agent |
| `agent_health` | Latest real endpoint health observation, when one exists |
| `agent_reputation` | Reputation values derived from verifiable sources, when available |
| `agent_scores` | Versioned Sift Score output; no row exists until scoring is implemented |
| `sync_state` | Last successfully persisted block for each chain and registry deployment |

ERC-8004 agent identifiers are stored as checked decimal strings so uint256 values cannot lose precision in JavaScript. EVM addresses are canonicalized to lowercase at the repository boundary and enforced by the database. Optional upstream values remain nullable; health, reputation, and score values have no synthetic defaults.

Child observations use explicit `on delete cascade` foreign keys because they have no meaning after their parent agent is removed. Agent identity is unique across `(chain_id, registry_address, agent_id)`, while sync state has exactly one row per `(chain_id, registry_address)`.

## Security boundary

All six `public` tables have Row Level Security enabled. The migration revokes access from `anon` and `authenticated` and defines no browser policies in M2. Only the server-side client uses `SUPABASE_SECRET_KEY`, which bypasses RLS and therefore must never enter a browser bundle. `server-only` guards the client and repository modules at build time.

Do not create a browser Supabase client until a later milestone has a concrete, least-privilege need. Do not expose repository errors directly in a public response; the repository error wrapper deliberately omits provider details and credentials from its message.

## Data access

Application and future indexer code must use the repositories in `lib/db/` rather than issuing Supabase queries from React components:

- `createAgentRepository()` provides typed identity reads and complete agent upserts.
- `createSyncStateRepository()` provides typed checkpoint reads and upserts.
- `validation.ts` validates and maps camelCase boundary inputs to the snake_case schema.

The repository inputs require unknown upstream fields to be passed explicitly as `null`. This keeps missing information distinguishable from fabricated defaults.

## Type generation

`lib/db/database.types.ts` is the faithfully maintained strict schema contract for the checked-in M2 migration. Once the local stack is running, generate an independent CLI snapshot:

```bash
npm run db:types
```

The command writes `lib/db/database.generated.ts`, which is intentionally ignored. Review it against `lib/db/database.types.ts` whenever a migration changes, reconcile legitimate differences, run `npm run typecheck`, and commit the maintained contract with the migration. Generating against a linked hosted project is also possible with `supabase gen types typescript --linked --schema public`, but the migration history must be current first.

## Hosted project workflow

Use a free-tier Supabase project unless a paid service is explicitly approved. Authenticate and link once, preview changes, then apply only checked-in migrations:

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push --dry-run
npx supabase db push
```

Do not run a linked database reset against production. Do not make untracked schema changes in the dashboard; if drift occurs, reconcile it through a reviewed migration before continuing.

## M2 validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

An integration reset (`npm run db:reset`) additionally verifies PostgreSQL constraints and relationships when a Docker-compatible runtime is available. M2 does not make BNB RPC calls, index ERC-8004 events, fetch metadata, calculate health or Sift Scores, or insert agent records.
