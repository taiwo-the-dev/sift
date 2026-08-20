# TICKET-012 — M12 Hackathon Readiness

## Status

Ready

## Depends On

M11 — Production Polish

## Objective

Prepare, deploy, verify, and document Sift as a reliable BNB Chain hackathon submission with a repeatable live demo, safe BSC Testnet procedure, clear architecture/setup guidance, screenshots, limitations, and a future roadmap.

## Product Context

A strong implementation can still fail a hackathon review if the live URL is unreliable, the test wallet flow is unclear, or the judges cannot understand the architecture and product story quickly. This milestone makes the completed product demonstrable and reproducible without hiding limitations or relying on undocumented operator knowledge.

## Scope

- Confirm every prior milestone is complete or explicitly document any approved limitation before release.
- Prepare production environment configuration for Vercel and Supabase without committing values.
- Deploy the Next.js application to Vercel using the approved project/account.
- Apply production Supabase migrations through the documented safe process.
- Configure and verify the production Sift Indexer schedule/operation using the approved free-tier mechanism.
- Verify production RPC fallback and source configuration.
- Create a repeatable BSC Testnet wallet/funding procedure without publishing private keys.
- Execute and document the complete demo path:
  - open landing page;
  - search in plain language;
  - browse real results across required categories;
  - open an agent profile;
  - inspect trust/Sift Score;
  - compare agents;
  - connect a wallet;
  - complete the supported testnet hiring/job flow;
  - inspect the resulting dashboard/activity.
- Create a concise demo guide/script with expected states, recovery steps, and timing.
- Update the README with product summary, live URL, screenshots, technology stack, local setup, environment variables, migrations, indexing, testing, deployment, and demo steps.
- Add an architecture diagram covering BNB Chain → Sift Indexer → Supabase PostgreSQL → Next.js → Vercel and relevant wallet/job interactions.
- Add current screenshots for key product screens.
- Document known limitations, data freshness, supported networks/contracts, and future roadmap.
- Verify public metadata, OpenGraph preview, favicon, links, and repository documentation from a clean browser/session.
- Create a final release checklist and record the tested deployment/version/commit.

## Out of Scope

- New optional product features after the demo path works.
- Mainnet financial transactions or production custody.
- Concealing broken flows with screenshots, prerecorded-only behavior, fake data, or mocked transaction confirmations.
- Paid infrastructure, RPC, monitoring, analytics, or AI services without explicit approval.
- New architecture introduced only for presentation.
- Publishing reusable private test wallet credentials.
- Automatic continuation into post-hackathon roadmap work.

## Technical Requirements

- Use Vercel for Next.js and Supabase free tier unless a documented approved change exists.
- Use a free/public RPC strategy with configured fallback and documented rate limitations.
- Use GitHub Actions or another approved free scheduling path for incremental indexing where practical.
- Ensure production environment variables are defined in deployment configuration and absent from git history/source files.
- Verify build and runtime behavior in the actual deployment environment, not only locally.
- Ensure database migrations and indexer commands are repeatable from documentation.
- Keep architecture and setup documentation aligned with the real implementation.
- Optimize demo dependencies for reliability: known testnet contracts, funded disposable wallet procedure, indexed compatible agents, and recovery instructions.
- Record data freshness and last successful index/health/score updates where the product exposes them.

## Data Integrity Requirements

- The deployed catalogue, scores, health, reputation, jobs, activity, and transactions must remain real and source-backed.
- Never substitute mocked production data when an external dependency fails.
- Demo/test fixtures must not appear as unlabeled live marketplace records.
- Screenshots and documentation must match the current product and current supported behavior.
- Known data gaps, stale sources, and unsupported categories/actions must be disclosed.
- The demo transaction/job must be verifiable on BSC Testnet where the chosen protocol supports it.

## Security Requirements

- Never commit or publish Vercel/Supabase credentials, RPC secrets, WalletConnect secrets where applicable, private keys, seed phrases, or funded wallet credentials.
- Use a disposable testnet wallet procedure and share only its public address when needed.
- Review deployment logs, repository history, screenshots, and documentation for leaked secrets.
- Verify production CORS, security headers, RLS/access policies, server-only credentials, and wallet network restrictions.
- Confirm no mainnet transaction can be triggered accidentally by the documented demo.
- Confirm external links and explorer links use the correct supported chain.

## UX Requirements

- A judge must understand Sift's purpose within five seconds of opening the live URL.
- The primary demo path must work in a clean browser with clear loading and recovery states.
- The demo guide must be concise enough to follow under time pressure.
- Known limitations must be transparent but should not interrupt the core story.
- Screenshots and architecture diagrams must be legible in the README.
- The application must remain usable on a common mobile viewport and current desktop browsers.
- No obvious placeholder, debug, broken, empty-without-guidance, or dead-control state may appear in the planned demo.

## Acceptance Criteria

- [ ] A production Vercel URL is deployed and publicly reachable.
- [ ] Production Supabase schema, environment variables, RPC configuration, and indexer operation are verified.
- [ ] The live application displays real indexed BNB Chain agent data.
- [ ] The complete primary demo path succeeds in a clean browser.
- [ ] A real supported BSC Testnet job/transaction can be demonstrated and verified where the protocol allows.
- [ ] A safe sample testnet wallet/funding procedure is documented without exposing secrets.
- [ ] README includes live URL, screenshots, architecture, setup, migrations, indexing, tests, deployment, demo guide, limitations, and roadmap.
- [ ] Architecture diagram matches the deployed implementation.
- [ ] Metadata, OpenGraph, favicon, links, and error states work on the live URL.
- [ ] All required four categories are demonstrable with honest data availability.
- [ ] No fake production data, secret, private key, or mainnet-risk path exists.
- [ ] Final local and deployed smoke tests, lint, typecheck, relevant tests, and production build pass.

## Testing Requirements

- Run all existing unit and integration tests against the release candidate.
- Run the primary E2E/demo path locally and against the deployed Vercel URL.
- Test fresh/disconnected wallet, wrong network, testnet connection, transaction rejection, successful testnet job, pending reload, confirmation, and dashboard visibility.
- Test production search, filters, profiles, scoring explanations, comparison, empty/error states, and mobile navigation.
- Verify links, images, metadata/OpenGraph, and README commands from a clean checkout where practical.
- Perform a deployment smoke test after final environment or migration changes.
- Run `npm run lint`, typecheck, all relevant tests, and `npm run build` before declaring readiness.

## Definition of Done

M12 is complete when the live Vercel deployment, real indexed catalogue, complete testnet demo flow, safe wallet procedure, README, screenshots, architecture diagram, setup/deployment/demo documentation, limitations, and final validation evidence are all current and reproducible, with no unresolved issue that would break the core judging experience.

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
