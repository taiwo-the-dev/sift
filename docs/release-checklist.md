# M12 release checklist

This is the evidence record for the Sift hackathon release. Check an item only
after observing it on the exact production commit. A screenshot, fixture, or
local result is not evidence that a production wallet transaction succeeded.

## Candidate record

| Field | Recorded value |
| --- | --- |
| Package version | `0.1.0` |
| Local baseline commit | `a2867a02d0b276f8e80ea5dd08b9b1e19213039f` |
| M12 release commit | Not recorded; current M12 work is uncommitted |
| Vercel production URL | Not deployed / not recorded |
| Vercel deployment ID | Not recorded |
| Production Supabase schema check | M0–M13 schema is live; the three M14 evidence tables are pending migration deployment |
| Latest successful indexer run | BSC Mainnet bootstrap completed on 2026-09-03; scheduled incremental health still needs confirmation |
| Latest successful assessment run | Not current; scheduled run `#8` failed during dependency installation on 2026-08-24 |
| Stored index checkpoint | BSC Mainnet block/head `119684064`, reported 2026-09-03; BSC Testnet block/head `127211325` was stale at the same observation |
| Mainnet catalogue | 331,747 real indexed chain-56 identities at the completed checkpoint |
| M14 category evidence | Repository implementation complete; hosted migration/backfill/report pending |
| Latest stored health / score evidence | 2026-08-22 20:38:19 UTC / 2026-08-22 20:38:22 UTC |
| Live RPC smoke | Passed at confirmed BSC Testnet head `126972263` on 2026-08-24 |
| BSC Testnet demo transaction | Not recorded |
| Validation date | 2026-08-24 (local release candidate) |

The lockfile in this M12 candidate has been regenerated for npm 10/11 clean
install compatibility, and both workflows use the current Node-runtime GitHub
Action majors. The workflow fix cannot be considered deployed until this
candidate is committed, pushed, and both scheduled jobs pass.

## Automated gate

- [x] `npm ci` succeeds with npm 10, matching the failed release runner boundary.
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes (199 tests).
- [x] `npm run test:wallet-ui` passes (8 rendered-state tests).
- [x] `npm run build` passes with the configured hosted environment.
- [ ] `npm audit` currently reports 18 transitive vulnerabilities (17 moderate,
      1 high) through the existing shadcn tooling and wallet dependency trees;
      M14 adds no package dependency. Review upgrades separately without forcing
      a breaking wagmi migration into this milestone.
- [ ] `npm run release:data` verifies every hosted table and source freshness (blocked until the M14 migration/report is live).
- [ ] `npm run release:smoke -- http://127.0.0.1:3102` passes against the local production build (the new M14 report gate currently returns 503 until migration deployment).
- [ ] `npm run release:smoke -- https://<production-origin>` passes.

## Production services

- [ ] Every migration is present in the hosted Supabase migration history.
- [ ] RLS and browser-role revocations are verified for all private tables.
- [ ] Vercel has the required production variables and no secret is browser-public.
- [ ] The deployed commit exactly matches the recorded release commit.
- [ ] The latest scheduled indexer run succeeds and advances or confirms its checkpoint.
- [ ] The latest scheduled health/score run succeeds with honest bounded output.
- [ ] RPC primary/fallback behavior succeeds without exposing provider credentials.
- [ ] Data freshness visible in Sift agrees with the latest persisted observations.
- [ ] M14 migration, category backfill, 12-agent shortlist, and 8004scan cross-check are persisted.
- [ ] `npm run report:categories` and the public read-only report pass for all four categories.

## Clean-browser product path

- [ ] Landing purpose is clear within five seconds.
- [ ] Plain-language search and each of the four category routes work with honest real/empty states.
- [ ] A real indexed profile shows identity, source, freshness, and Unknown fallbacks correctly.
- [ ] Comparison works for two or three real agents and preserves Unknown evidence.
- [ ] Mobile navigation, forms, profile tabs, comparison controls, and wallet dialogs pass keyboard review.
- [ ] Metadata, canonical URL, OpenGraph image, favicon, manifest, robots, external links, and error states work on production.
- [ ] A common mobile viewport and current desktop browser have no blocking layout issue.

## Wallet and job path

- [ ] A fresh disposable wallet connects on BSC Testnet chain ID `97`.
- [ ] Wrong-network switch approval and rejection behave safely.
- [ ] A compatible agent returns a valid owner-bound status and signed quote.
- [ ] Transaction rejection remains honest and resumable.
- [ ] A human explicitly approves the real BSC Testnet transaction sequence.
- [ ] Every confirmed step links to the correct BSC Testnet receipt and job ID.
- [ ] Reload recovers pending/confirmed state without duplicate signing.
- [ ] The dashboard challenge succeeds for the hiring wallet.
- [ ] A second wallet cannot read or resume the first wallet's job.
- [ ] No mainnet transaction, unlimited approval, custody, fabricated confirmation, or secret exposure occurs.

## Submission package

- [x] Architecture and trust boundaries are documented.
- [x] Safe disposable-wallet/funding procedure and recovery steps are documented.
- [x] Local release-candidate screenshots are labelled by source.
- [x] Setup, migration, indexing, testing, deployment, demo, limitations, and roadmap are documented.
- [ ] Replace the pending live URL and release record after Vercel deployment.
- [ ] Review repository history, deployment logs, screenshots, and docs for secrets.
- [ ] Rehearse the timed demo twice from a clean browser profile.

M12 remains blocked until every item that protects the core judging path is
complete. Do not continue into optional post-hackathon features automatically.
