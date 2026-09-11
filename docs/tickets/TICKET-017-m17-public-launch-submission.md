# TICKET-017 — M17 Public Launch & Submission Package

## Status

In Progress — public baseline passes; final candidate and owner materials pending

## Depends On

M16 — Judge-Path Validation, plus all unresolved external gates recorded in M12

## Objective

Release the exact validated Sift candidate at a reliable public URL and submit a
complete, verifiable package that makes the product, BNB integration, technical
quality, differentiation, and adoption plan easy for judges to evaluate.

## Product Context

Public accessibility is an explicit eligibility rule. The broader BNB Chain
evaluation guidance also rewards a clean licensed repository, clear user and
system diagrams, real deployment/integration evidence, and a credible path
beyond the hackathon. A local build or polished screenshots cannot substitute
for a reproducible public experience.

## Scope

- Select an owner-approved standard open-source license and add the root
  `LICENSE` file; do not guess legal ownership or licensing intent.
- Ensure the GitHub repository is public, forkable, current, and free of secrets,
  generated clutter, misleading branches, and unexplained critical failures.
- Add concise dependency/third-party attribution and verify asset licensing.
- Deploy the exact validated commit to the approved Vercel project.
- Configure production Supabase, RPC, 8004scan enrichment, wallet, and scheduler
  variables without exposing secrets.
- Apply/verify migrations, RLS/browser-role restrictions, the mainnet
  checkpoint, scheduled sync, health, and score assessment.
- Pass production-origin smoke tests and verify metadata, OpenGraph, favicon,
  robots, canonical URL, external links, errors, mobile navigation, and data
  freshness.
- Re-run the complete clean-browser judge path on the public URL, including the
  approved mainnet wallet boundary and dashboard recovery evidence.
- Add a clear user-journey diagram alongside the existing architecture diagram.
- Finalize README, setup, demo, deployment, limitations, security boundaries,
  sustainability/business model, adoption plan, and post-hackathon roadmap.
- Record meaningful-use evidence for the official Agent Studio CLI/TypeScript
  SDK, 8004scan API, and BSC Mainnet network/explorer configuration, including
  versions, provenance, fallback behavior, and secrets review.
- Prepare the official submission fields, concise deck, current screenshots,
  short demo video, live URL, public repo URL, team details, supported chain and
  contract/explorer links.
- Record a real explorer-verifiable transaction only when the owner explicitly
  approves its mainnet cost; otherwise disclose that execution proof remains pending.
- Rehearse the timed demo twice from clean browser profiles and document recovery
  for RPC, wallet, stale data, or service failure.
- Monitor the official event page and support channels for submission-form and
  Phase 2 updates. Route new Phase 2 work to M18 rather than improvising here.
- Freeze and record the release commit, deployment ID, validation time, data
  checkpoints, evidence links, known limitations, and final checklist result.

## Out of Scope

- Custody, autonomous wallet authority, or any mainnet transaction that the
  owner has not explicitly reviewed and approved.
- Claims of partnerships, adoption, users, revenue, performance, or transactions
  without documentary evidence.
- Paid hosting, RPC, analytics, monitoring, AI, or design services without approval.
- Altana, TermiX, PancakeSwap, or other partner-track work.
- Late optional features that risk the validated core journey.
- Guessing or implementing unpublished Phase 2 requirements.

## Technical Requirements

- Use Vercel and Supabase free tiers unless the owner explicitly approves a
  documented alternative.
- The deployed commit must match the recorded Git commit exactly.
- Production config must use environment variables, server-only secrets, safe
  client-variable prefixes, and no values committed to git.
- Scheduled jobs must use lockfile-based clean installs and complete successfully
  on the release commit.
- Production catalogue/assessment freshness thresholds must pass or visibly
  disclose degradation.
- Run release verification from outside the local development server against
  the public HTTPS origin.
- Keep deployment, migration, indexing, rollback, and smoke commands reproducible.

## Data Integrity Requirements

- Every screenshot, count, score, health status, transaction, and demo claim
  must match the public release and include its source/time where material.
- Never swap in seed/mock data when production services fail.
- Explorer links must use the correct chain, address, and transaction.
- Clearly identify BSC Mainnet chain ID `56` for discovery and task actions.
- Limitations and stale/unavailable evidence remain visible in the app and docs.

## Security Requirements

- Review git history, deployment settings/logs, workflows, docs, screenshots,
  videos, and browser bundles for secrets/private wallet material.
- Verify RLS and browser-role revocations for private database tables.
- Use a disposable mainnet wallet with minimum funds and publish only safe
  public evidence.
- Confirm security headers, redirect/URL validation, server-only keys, wallet
  chain guards, finite approvals, and two-wallet isolation on production.
- No mainnet write path may be available in the release candidate.

## UX Requirements

- The public URL communicates Sift's purpose and primary action immediately.
- A clean-browser judge can complete the rehearsed journey without setup docs.
- README and submission materials are concise, current, and mutually consistent.
- The deck/video shows the real product and real evidence, not a conceptual mock.
- Limitations are transparent without obscuring the product's value.
- Recovery instructions exist but the happy path does not depend on operator help.

## Acceptance Criteria

- [ ] An owner-approved standard license exists at the repository root.
- [ ] The repository is public, forkable, organized, documented, and secret-free.
- [ ] Dependency and asset attribution is current.
- [ ] The exact release commit is publicly deployed and reachable during judging.
- [ ] Production schema, RLS, variables, mainnet indexer, health, scores,
      RPC fallback, and freshness are verified.
- [ ] Agent Studio, 8004scan, and official BSC resource usage is documented and
      supported by real compatibility, enrichment, and transaction evidence.
- [ ] Production-origin smoke tests and the complete judge path pass.
- [ ] Any claimed real mainnet activation has correct BscScan evidence; if the
      owner declines the cost, the limitation is explicit.
- [ ] README, architecture, user journey, demo, security/limitations, business,
      adoption, and roadmap documentation match the release.
- [ ] Submission form, deck, demo video, screenshots, URLs, and team/contract
      details are complete and verified.
- [ ] Two clean-profile rehearsals complete with recorded results.
- [ ] The release record names the commit, deployment, time, checkpoints, and
      remaining non-blocking limitations.
- [ ] No fake data/claim, secret, paid unapproved service, or mainnet-risk path exists.

## Implementation Note — 2026-09-10

The repository and application are public. The production-origin smoke check
and 12-case desktop/mobile mainnet browser suite pass against the current
baseline. `docs/submission-package.md` now contains the product narrative, demo
outline, evidence inventory, deck structure, and explicitly empty owner fields.

M17 remains in progress. The new candidate is not committed or deployed,
Supabase migration history is not operator-confirmed, the license has not been
selected, human sessions/wallet checks are not recorded, and the owner still
needs to create the deck, video, team fields, and final submission entry.

## Testing Requirements

- Run all unit, integration, wallet UI, browser, release-data, and release-smoke
  tests against the release candidate.
- Run `npm ci`, `npm run lint`, typecheck, `npm test`, `npm audit`, and
  `npm run build` using the documented release commands.
- Test the public origin on current desktop and mobile browsers and a clean
  wallet profile.
- Confirm scheduled workflows succeed after the release commit is pushed.
- Verify every public link and explorer reference manually.

## Definition of Done

M17 is complete when Sift is publicly accessible on the exact validated commit,
the full judging journey and schedules work in production, the open-source and
submission packages are complete, every material claim is verifiable, and no
known issue can disqualify or break the main-track evaluation.

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
