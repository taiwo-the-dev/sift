# Sift release checklist

This is the evidence record for the Sift hackathon release. Check an item only
after observing it on the exact production commit. Local results prove the
candidate, not the deployed site. A prepared wallet action is not a confirmed
transaction.

## Current release direction

The owner selected a **dual BSC network release path on 2026-09-11**. Mainnet
remains the default, while a persistent header selector lets users browse the
separate chain `56` and chain `97` catalogues. Agent identities, checkpoints,
wallet actions, jobs, dashboard sessions, RPC verification, and explorer links
must remain bound to their original network.

A complete mainnet ERC-8183 hire can spend real BNB or tokens. Codex may validate
the read-only path and transaction preparation, but only the wallet owner may
approve a real transaction after reviewing the amount, contract, and network.

## Candidate record

| Field | Recorded value |
| --- | --- |
| Package version | `0.1.0` |
| Current public commit | `f2d8883` |
| Current local release candidate | Uncommitted changes on top of `f2d8883` |
| Vercel production URL | <https://sift-ten-swart.vercel.app> |
| Vercel deployment | Public deployment of `f2d8883`; replacement deployment ID not yet recorded |
| Production Supabase schema | Current category, service, health, score, and job operations succeed; migration history still needs operator confirmation |
| Mainnet catalogue | Current at confirmed head `121126225`; approximately 341,163 chain-56 agents reported at 2026-09-10 19:31 UTC |
| M14 category evidence | PASS: taxonomy `sift-category-taxonomy-v1.1.0`, 12 shortlisted agents, and 12 current 8004scan cross-checks |
| Latest bounded service check | 100 checked: 3 available, 70 unavailable, 27 unsupported |
| Latest bounded health check | 50 checked: 4 online and 46 honest unknown/client-error outcomes |
| Latest score run | Completed without query timeout; 4 candidates were withheld for insufficient verified evidence |
| Agent Studio / SDK readiness | CLI and SDK mainnet runtime pass; genuine Studio project and ERC-8183 category representatives are still missing |
| Public smoke | PASS on 2026-09-10 against the URL above |
| Public browser path | 12/12 PASS on desktop Chromium and a Pixel 7 viewport on 2026-09-10 |
| Human mainnet task / hire | Not recorded |
| Two-wallet dashboard isolation | Not recorded for the release candidate |

The category report correctly keeps reputation unavailable where Sift has no
verified reputation source. Health and scores are not filled with guessed data.

## Automated gate

- [x] `npm ci` succeeds from the current candidate lockfile.
- [x] `npm run lint` passes on the current candidate.
- [x] `npm run typecheck` passes on the current candidate.
- [x] `npm test` passes (314/314) on the current candidate.
- [x] `npm run test:wallet-ui` passes (19/19) on the current candidate.
- [x] `npm run test:browser` passes locally against a production build (14/14),
      including desktop and mobile network switching.
- [x] `PLAYWRIGHT_BASE_URL=https://sift-ten-swart.vercel.app npm run test:browser`
      passes against the current public baseline (12/12).
- [x] `npm run build` passes on Next.js `16.3.4` for the current candidate.
- [x] `npm audit --audit-level=high` has no high or critical finding. The audit has 16
      moderate transitive WalletConnect/wagmi findings whose offered fix is a
      breaking wagmi 3 migration; this risk remains documented.
- [x] `npm run release:data` verifies current hosted tables and source freshness.
- [x] `npm run report:categories` passes for all four categories.
- [x] `npm run release:smoke -- https://sift-ten-swart.vercel.app` passes for the
      current public baseline.
- [ ] Repeat production smoke after the new release commit is deployed.

## Production services

- [ ] Every migration is present in hosted Supabase migration history.
- [ ] RLS and browser-role revocations are verified for private tables.
- [ ] Vercel has the required production variables and no secret is browser-public.
- [ ] The deployed commit exactly matches the recorded release commit.
- [ ] Both scheduled indexer jobs succeed and independently advance or confirm their checkpoints.
- [ ] The scheduled health/service/score workflow succeeds on the release commit.
- [ ] RPC primary/fallback behavior succeeds without exposing provider credentials.
- [ ] Data freshness visible in Sift agrees with persisted observation times.
- [x] Mainnet indexing is current at the recorded confirmed head.
- [x] M14 category evidence is current and persisted for all four categories.
- [x] The score candidate query completes without the former statement timeout.

## Clean-browser product path

- [x] Landing purpose and primary search are visible.
- [x] Plain-language search and all four category routes return real mainnet data.
- [x] A real mainnet profile exposes identity, evidence, freshness, and Unknown states.
- [x] Two real mainnet agents can be compared.
- [x] The Available filter leads to a currently supported action route.
- [x] The disconnected dashboard explains the wallet boundary.
- [x] Desktop/mobile layout, keyboard search, mobile navigation, and reduced
      motion pass the automated browser suite.
- [ ] Complete a manual screen-reader and visible-focus spot check.
- [ ] Document three novice user sessions and retest reproducible P0/P1 findings.

## Mainnet wallet and task path

- [ ] Connect a disposable wallet that contains only the minimum mainnet funds
      the tester is willing to risk.
- [ ] Verify the UI labels chain ID `56`, the target agent, method, price, token,
      recipient/contract, and expected wallet steps before approval.
- [ ] Confirm wrong-network rejection and account-change recovery.
- [ ] Confirm wallet rejection leaves the task honest and resumable.
- [ ] For a no-spend check, stop before wallet confirmation and verify no
      transaction hash or success state is created.
- [ ] If the owner approves a real mainnet hire, independently verify every
      receipt and job ID on BscScan and record the exact public evidence.
- [ ] Reload and recover a pending/confirmed job without duplicate signing.
- [ ] Sign into the dashboard with the hiring wallet.
- [ ] Confirm a second wallet cannot read or resume the first wallet's job.
- [ ] Confirm there is no custody, unlimited approval, silent retry, fabricated
      confirmation, or automatic mainnet transaction.

## Submission package

- [x] Public repository exists at <https://github.com/taiwo-the-dev/sift>.
- [x] Public application exists at <https://sift-ten-swart.vercel.app>.
- [x] Architecture, data integrity, deployment, and recovery are documented.
- [x] Mainnet catalogue, category, 8004scan, health, service, and score evidence
      is recorded without substituting fake data.
- [ ] The owner selects and approves a repository license; add `LICENSE` only
      after that decision.
- [ ] Confirm hosted migration history and production variables.
- [ ] Commit, push, deploy, and record the exact new release commit/deployment.
- [ ] Confirm both scheduled workflows pass on that commit.
- [ ] Complete three novice sessions and the mainnet wallet/two-wallet checks.
- [ ] Prepare final screenshots, deck, demo video, form fields, team details,
      contract/explorer links, and two clean-browser rehearsals.
- [ ] Review repository history, deployment logs, images, video, and docs for secrets.

## Current release result

The repository and public baseline have strong automated evidence, but M16 and
M17 are **not complete**. Hosted migration history, the exact replacement
deployment, human usability evidence, owner-approved licensing, wallet/two-wallet
proof, and submission media still require the owner.
