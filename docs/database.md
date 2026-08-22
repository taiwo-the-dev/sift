# Hosted Supabase database

Sift uses a hosted Supabase PostgreSQL project. The repository is migration-driven, browser access is denied by default, and no seed file exists because Sift must never present invented agent or blockchain records.

Docker and a local Supabase stack are not part of this workflow.

## Repository responsibilities

The repository contains:

- `supabase/config.toml`, which the Supabase GitHub integration reads from the repository root;
- ordered SQL migrations under `supabase/migrations/`;
- strict maintained database types in `lib/db/database.types.ts`;
- a server-only Supabase client and typed repositories in `lib/db/`;
- no database passwords, API keys, project references, or fabricated seed records.

The Supabase project owns the running PostgreSQL database and Data API. GitHub deploys schema changes; the Next.js server connects at runtime through environment variables.

## One-time Supabase setup

In the hosted Supabase project:

1. Open **Project Settings > Integrations**.
2. Authorize GitHub and select the Sift repository.
3. Set the working directory to `.` because `supabase/` is at the repository root.
4. Select the production branch, normally `main`.
5. Enable **Deploy to production** only when merges to that branch should apply migrations automatically.
6. Add the Supabase deployment check as a required GitHub check when branch protection is available.

Automatic preview branching is optional and is not required for Sift's current free-tier workflow. Do not enable GitHub as a Supabase Auth provider; application authentication belongs to a later milestone.

## Runtime environment

Copy the environment template:

```bash
cp .env.example .env.local
```

From the hosted project dashboard:

1. Copy the HTTPS **Project URL** from the Connect dialog into `SUPABASE_URL`.
2. Create or copy a current secret key (`sb_secret_...`) from **Settings > API Keys** into `SUPABASE_SECRET_KEY`.

```env
SUPABASE_URL=<hosted-project-url>
SUPABASE_SECRET_KEY=<server-secret-key>
```

The values above are illustrative only. Never commit `.env.local`, paste a real key into documentation, prefix the secret with `NEXT_PUBLIC_`, or place it in a browser-accessible client.

Add the same two variables to the deployment provider, such as Vercel, for Production and any environment that will execute server-side database code. A GitHub-to-Supabase connection does not automatically configure Next.js or Vercel environment variables.

The landing page, M4 `/discover` route, and M5/M6 agent profiles query the catalogue through server-only repositories. Missing or invalid values never enter a browser bundle: public surfaces fall back without fake records and data-source failures show plain-language retry states.

## Schema deployment through GitHub

The preferred hosted workflow is:

1. Create or review a timestamped migration under `supabase/migrations/`.
2. Run repository tests and review the SQL.
3. Commit the migration and push it to GitHub.
4. Let the Supabase integration validate the change.
5. Merge to the configured production branch.
6. Confirm the Supabase deployment succeeded before relying on the new schema.

The M2 migration creates these six tables:

| Table | Responsibility |
| --- | --- |
| `agents` | Canonical chain/registry/agent identity and last verified normalized metadata |
| `agent_services` | Multiple service declarations associated with an agent |
| `agent_health` | Latest bounded real endpoint observation and endpoint-specific history |
| `agent_reputation` | Reputation values with explicit verifiable source and observation time, when available |
| `agent_scores` | Versioned, reproducible Sift Score assessments, including honestly withheld results |
| `sync_state` | Last successfully persisted block for each chain and registry deployment |

Do not manually recreate or modify these tables in the production Table Editor. Schema changes must be represented by reviewed migration files so GitHub and Supabase migration history remain synchronized.

## M4 discovery search

`20260822090000_add_agent_discovery_search.sql` adds:

- a GIN search index over normalized agent service fields;
- the server-only `search_agents` PostgreSQL function;
- bounded page sizes, validated filter/sort values, exact result counts, and deterministic identity tiebreakers;
- PostgreSQL text matching across agent names, descriptions, categories, service types, endpoints, and service metadata;
- transparent keyword-derived category matches for records whose source metadata has no canonical Sift category.

The function is `security invoker`, is unavailable to `anon` and `authenticated`, and is callable only through the server-side service role. It never creates, updates, seeds, or ranks agent records. “Best text match” is PostgreSQL text relevance, not a Sift Score.

Deploy this migration through the configured Supabase GitHub integration before deploying the M4 application change. A CLI fallback requires a linked checkout owned by an account with project privileges:

```bash
npm run db:migrations
npm run db:push:dry-run
npm run db:push
```

Do not run the application and database deployments out of order: `/discover` intentionally reports an unavailable catalogue until `search_agents` exists.

## M5 profile provenance

`20260822111500_add_metadata_verification_time.sql` adds the nullable `agents.metadata_verified_at` field. It records the most recent successful metadata validation independently from `last_synced_at`, which continues to describe the latest catalogue write. The migration backfills the existing timestamp only for records that are currently valid; it does not invent a successful verification for invalid, unavailable, or pending metadata.

The updated Sift Indexer writes `metadata_verified_at` after a successful validation and preserves it after later failures. Deploy this migration through the Supabase GitHub integration before deploying or running the matching indexer update, because the updated upsert contract includes the new column.

## M6 evidence provenance

`20260822130000_add_health_scoring_provenance.sql` adds the fields required to audit health and score results. Health rows record the checked service type, sanitized endpoint, endpoint fingerprint, outcome, and bounded check/success counts. Score rows may contain a null withheld score and persist an evidence snapshot plus source freshness. Reputation rows gain an explicit source and source-observation time; unprovenanced reputation is excluded from the formula.

The migration also adds three bounded `security invoker` selection functions callable only by `service_role`:

- `health_check_candidates` returns due valid agents with potentially eligible declarations, prioritizing scored and recently registered identities;
- `score_recalculation_candidates` returns missing, version-stale, changed, or newly expired assessments.
- `featured_agent_candidates` applies the exact current score, confidence, freshness, and successful-health qualification before ordering a bounded result.

Deploy the M5 migration first, then M6. Do not run `check:agents` or `score:agents` until both appear in hosted migration history. The full evidence contract and post-deployment verification sequence are in [Agent health and Sift Score](scoring.md).

The hosted M5 and M6 migrations were validated on 2026-08-22. A bounded check persisted an honest DNS-error/Unknown observation for BSC Testnet agent `#1883`, and the following score run persisted a withheld low-confidence assessment rather than manufacturing a score.

## Optional CLI verification

The Supabase CLI remains pinned as a development dependency for inspecting the hosted project. Docker is not needed for these linked-project commands.

Authenticate and link this checkout once:

```bash
npx supabase login
npm run db:link -- --project-ref <project-ref>
```

The project reference is the identifier in the hosted project URL. The link is stored in ignored Supabase CLI state and must not be committed.

Inspect migration history:

```bash
npm run db:migrations
```

Preview a manual deployment without applying it:

```bash
npm run db:push:dry-run
```

If GitHub automatic deployment is enabled, use the Supabase deployment page as the normal deployment path. `npm run db:push` is a deliberate manual fallback and changes the linked hosted database; do not run it casually or concurrently with a GitHub deployment.

Never run `supabase db reset --linked` against the hosted project. It is destructive and is intentionally not exposed as a package script.

## Type synchronization

`lib/db/database.types.ts` is the strict maintained contract for the checked-in migration. After the hosted migration has deployed, generate an independent snapshot from the linked project:

```bash
npm run db:types
```

The command writes `lib/db/database.generated.ts`, which is intentionally ignored. Review that snapshot against `lib/db/database.types.ts`, reconcile legitimate differences, and run `npm run typecheck`. Do not overwrite the maintained contract blindly because the application exports small helper types from it.

## Schema and data integrity

ERC-8004 agent identifiers are stored as checked decimal strings so uint256 values cannot lose precision in JavaScript. EVM addresses are canonicalized to lowercase at the repository boundary and enforced by the database. Optional upstream values remain nullable; health, reputation, and score values have no synthetic defaults.

Child observations use explicit `on delete cascade` foreign keys because they have no meaning after their parent agent is removed. Agent identity is unique across `(chain_id, registry_address, agent_id)`, while sync state has exactly one row per `(chain_id, registry_address)`.

Only the M3 Sift Indexer should create catalogue records, and every inserted identity must come from a verified registry event. M4 reads those records through `createDiscoveryRepository()` and never writes catalogue data. No seed or fabricated agent records are permitted.

## Security boundary

All six `public` tables have Row Level Security enabled. The migration revokes access from `anon` and `authenticated` and defines no browser policies in M2. Only the server-side client uses `SUPABASE_SECRET_KEY`, which bypasses RLS and therefore must never enter a browser bundle. `server-only` guards the client and repository modules at build time.

Do not create a browser Supabase client until a later milestone has a concrete, least-privilege requirement. Do not expose raw repository errors in a public response.

## Data access

Application and indexer code must use the repositories in `lib/db/` rather than issuing Supabase queries from React components:

- `createAgentRepository()` provides typed identity reads and complete agent upserts.
- `createAgentServiceRepository()` replaces normalized services without deleting the last-known-good set before successful writes.
- `createSyncStateRepository()` provides typed checkpoint reads and upserts.
- `createDiscoveryRepository()` provides bounded, parameterized catalogue search and recently registered reads.
- `createAgentProfileRepository()` composes one indexed identity with its declared services and any persisted health/reputation evidence without N+1 queries.
- `createHealthRepository()` reads a bounded due queue and persists validated endpoint observations.
- `createScoreRepository()` bulk-composes affected evidence and upserts deterministic versioned assessments.
- `createFeaturedAgentRepository()` returns only agents satisfying the documented current score/health rule.
- `validation.ts` validates and maps camelCase boundary inputs to the snake_case schema.

Repository inputs require unavailable upstream fields to be passed explicitly as `null`, keeping missing information distinguishable from fabricated defaults.

## Validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

After GitHub deploys the migrations, verify in the Supabase dashboard that all six tables exist, contain no fabricated records, have Row Level Security enabled, and show the expected migration history. M3 writes only real ERC-8004 identities, metadata, services, and checkpoints. M6 writes only bounded endpoint observations and reproducible assessments from those persisted inputs. It does not create reputation evidence, authentication, wallet, comparison, hiring, or user-generated records.
