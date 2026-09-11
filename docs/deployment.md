# Sift deployment runbook

Sift's approved approximately-$0 release topology is Vercel, hosted Supabase,
GitHub Actions, and public/free BNB RPC fallbacks. This runbook intentionally
contains variable names and public contract identifiers only—never credentials.

## Release order

1. Commit the reviewed release candidate and make the full local quality gate
   pass from a clean install.
2. Confirm the Supabase GitHub integration has applied every ordered migration
   under `supabase/migrations/` to the production project.
3. Confirm the scheduled indexer and assessment workflows install cleanly and
   complete successfully on that commit.
4. Import the GitHub repository into the approved Vercel project, configure the
   variables below, and deploy the same commit.
5. Run the release smoke verifier against the Vercel production origin.
6. Complete the clean-browser, disposable-wallet demo matrix and record the
   evidence in [release-checklist.md](release-checklist.md).

Do not deploy application code that expects a migration before Supabase has
applied it. Do not run `supabase db reset --linked` against the hosted project.

## Vercel configuration

Use the repository root as the project root, the detected Next.js framework,
`npm ci` for installation, `npm run build` for builds, and a supported Node.js
version matching `package.json`. No `vercel.json` is required by the current
architecture.

Set these values in Vercel's Production environment without committing them:

| Variable | Required | Exposure | Purpose |
| --- | --- | --- | --- |
| `SUPABASE_URL` | Yes | Server-only | Hosted Supabase HTTPS project URL |
| `SUPABASE_SECRET_KEY` | Yes | Server-only secret | RLS-bypassing repository access; never prefix with `NEXT_PUBLIC_` |
| `SIFT_SITE_URL` | Recommended | Server-only configuration | Canonical production HTTPS origin |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional | Browser-public | WalletConnect QR/mobile connection |
| `NEXT_PUBLIC_BNB_MAINNET_RPC_URL` | Optional | Browser-public | Public read-only browser RPC override |
| `SIFT_8004SCAN_API_KEY` | Required for the intended M14 Pro validation run | Server-only secret | Bounded 12-agent 8004scan cross-check; core discovery does not depend on it |

Preview environments need separate values if they are used for database-backed
review. Never point an untrusted preview at production service-role credentials.
After changing `NEXT_PUBLIC_` values, rebuild because they are compiled into the
browser bundle.

## Supabase verification

The production migration order is the lexical order in
`supabase/migrations/`. Use the Supabase GitHub deployment record as the normal
source of truth. A privileged operator may link a checkout and run:

```bash
npm run db:migrations
npm run db:push:dry-run
```

Only run `npm run db:push` as an intentional fallback after reviewing the dry
run and ensuring the GitHub integration is not deploying concurrently. Verify
RLS and absence of browser-role grants for catalogue, evidence, hiring, and
wallet-session tables. Never add a production seed.

## Scheduled Sift operations

Configure GitHub Actions with repository secrets `SUPABASE_URL` and
`SUPABASE_SECRET_KEY`. Add `BNB_MAINNET_RPC_PRIMARY` using a reviewed,
archive-capable free-tier BSC endpoint; optional `_FALLBACK_1` and `_FALLBACK_2`
variants preserve ordered fallback. Never place a token in a repository variable
or `NEXT_PUBLIC_` value.

- `sync-agents.yml` incrementally indexes BSC Mainnet every two hours. The
  release schedule intentionally does not recreate testnet catalogue rows.
- `assess-agents.yml` checks health and recalculates scores every six hours.
- The assessment workflow also refreshes the bounded cached 8004scan
  cross-check after the M14 shortlist exists.
- Both workflows use read-only repository permissions and no signing material.

Run `npm run index:smoke`, `npm run check:smoke`, and `npm run score:smoke`
before changing scheduler configuration. Public RPCs can rate-limit or cap block
ranges; the indexer resumes only from the last fully persisted checkpoint.

From a trusted operator checkout with the server-only Supabase values, verify
every required table and print only aggregate counts/source freshness:

```bash
npm run release:data
npm run report:catalogue
npm run report:categories
```

Before enabling the mainnet schedule, run `BNB_NETWORK=bsc-mainnet npm run
index:smoke`, then `BNB_NETWORK=bsc-mainnet npm run index:agents`. A partial run
is safe to resume. Do not describe mainnet discovery as ready until the report
shows non-zero chain-56 identities and a checkpoint equal to its recorded
confirmed head.

## Deployment smoke test

```bash
npm run release:smoke -- https://<production-origin>
```

The verifier checks the landing, discovery, all four categories, one real
indexed profile, comparison, dashboard privacy metadata, not-found behavior,
security headers, icons, OpenGraph image, manifest, and robots. It performs no
wallet action and no database write.

After it passes, manually exercise disconnected, wrong-network, rejected,
pending, confirmed, reload, dashboard, and second-wallet isolation states. A
script cannot approve or prove those human wallet boundaries.

## Rollback and recovery

- Vercel application regression: promote the last known-good deployment, then
  investigate without changing or deleting production data.
- Supabase migration failure: stop the application rollout and add a reviewed
  forward migration. Do not reset the hosted database.
- Indexer failure: restore secrets/RPC access and rerun the incremental job; the
  stored checkpoint prevents successful ranges from being repeated needlessly.
- External agent outage: preserve last-known-good metadata, expose the current
  unavailable state, and never replace it with a fixture.
- Protocol deployment change: block hiring until constants and live contract
  relationships are reverified against official sources.
