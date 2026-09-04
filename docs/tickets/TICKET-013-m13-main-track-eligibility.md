# TICKET-013 — M13 Main-Track Eligibility & BSC Mainnet Catalogue

## Status

Complete — the hosted BSC Mainnet catalogue reached confirmed head `119684064`
with 331,747 real indexed identities on 2026-09-03

## Depends On

M11 — Production Polish, plus the repository-side audit and release tooling
already delivered during M12. M12's final public-deployment gate is intentionally
re-checked in M17 after this remediation sequence.

## Objective

Make Sift satisfy the published requirement that surfaced agents are live on
BSC by indexing a real BSC mainnet ERC-8004 catalogue, keeping network evidence
explicit, and restoring reliable scheduled freshness without weakening the
existing testnet safety boundary.

## Product Context

Sift began M13 with 1,890 BSC Testnet identities and zero BSC Mainnet
identities. The completed bootstrap now has 331,747 chain-56 identities at
confirmed head `119684064`. Judges need a catalogue
of agents that exist on the production chain and must always be able to see
which network supports discovery versus activation.

## Scope

- Verify the current official BSC mainnet ERC-8004 registry address, deployment
  block, ABI, and chain ID from authoritative sources before indexing.
- Use official BNB Chain network documentation for chain IDs, RPC behavior, and
  explorer links; record the source and verification date.
- Bootstrap BSC mainnet registry events into the existing hosted Supabase
  schema using the Sift Indexer and its normal provenance rules.
- Preserve BSC Testnet records; do not relabel or migrate them as mainnet data.
- Ensure identity uniqueness remains bound to chain, registry, and onchain agent
  ID, with independent mainnet and testnet checkpoints.
- Configure independent incremental schedules for supported networks so one
  network cannot overwrite, skip, or block the other's checkpoint.
- Add explicit network selection and network badges wherever users discover,
  compare, inspect, or activate an agent.
- Default the judge-facing discovery journey to eligible live BSC agents while
  preserving an intentional route/filter for testnet development records.
- Keep hiring restricted to the verified supported transaction chain and fail
  closed for mainnet or incompatible agents.
- Expose source block, last synchronization time, and stale/unavailable states.
- Add an operator-readable eligibility/freshness report with counts per network
  and last successful checkpoint.
- Ask the official support channel whether "live on BSC" permits testnet agents
  and record the answer, but do not delay the safer mainnet catalogue work.
- Update architecture, indexer, deployment, demo, and limitations documentation.

## Out of Scope

- Mainnet hiring, token approvals, escrow funding, autonomous execution, or any
  other mainnet financial write.
- Creating or deploying agents merely to inflate marketplace supply.
- Replacing the Sift Indexer with 8004scan or another proprietary catalogue.
- Category-depth enrichment, activation proof, public deployment, submission
  video, partner bounties, or guessed Phase 2 work.
- Destructive replacement of the existing testnet catalogue.

## Technical Requirements

- Continue using viem and the existing bounded, checkpointed ERC-8004 indexer.
- Verify the already configured chain-56 assumptions before relying on them.
- Document how BNB Agent Studio identities map to the indexed ERC-8004 records
  and how their ERC-8183 service declarations will be recognized in M15.
- Maintain strict TypeScript and existing database uniqueness/foreign-key
  constraints.
- Use separate workflow jobs, a safe matrix, or equivalent isolation for each
  network; concurrency settings must not cancel the other network's progress.
- Make bootstrap ranges bounded and resumable. A partial mainnet run must be
  safe to restart without duplicates.
- Retain RPC fallback, confirmation depth, log chunking, retry limits, metadata
  byte/time limits, and SSRF protections.
- Never expose the Supabase secret key or private RPC credentials to the browser.
- Preserve approximately $0 infrastructure cost using approved free RPC and
  scheduling options. Document rate-limit tradeoffs.
- Server Components remain the default for catalogue reads.

## Data Integrity Requirements

- Every agent must trace to a verified registry event on the stated chain.
- Store transaction hash, block number, registry, chain, and observation time
  when the source makes them available.
- Never copy testnet records into mainnet, fabricate missing metadata, or imply
  that registration proves an agent is healthy, reputable, or activatable.
- Metadata failures remain explicit and must not block identity persistence.
- Counts in documentation or UI must be generated from an observed snapshot and
  labelled with its time/network.

## Security Requirements

- Treat agent metadata URIs and service endpoints as untrusted input.
- Preserve HTTPS/IPFS allow rules, redirect revalidation, private-network
  blocking, response limits, timeouts, and bounded concurrency.
- No indexer signing key is required or permitted for read-only indexing.
- The UI must not offer a mainnet transaction path during this milestone.
- Review scheduler logs to ensure URLs are acceptable but credentials and full
  secret-bearing errors are redacted.

## UX Requirements

- Users can tell BSC mainnet and BSC Testnet apart before selecting an agent.
- A network change must preserve understandable search/filter state or explain
  why results changed.
- Empty, stale, partially indexed, and unavailable-network states are explicit.
- Network wording uses human labels with chain IDs available as supporting
  evidence, not unexplained blockchain jargon.
- A mainnet profile must never display a testnet activation control.

## Acceptance Criteria

- [x] The official chain-56 registry source and deployment boundary are cited.
- [x] Official BSC chain, RPC, and explorer configuration is cited and verified.
- [x] A resumable mainnet bootstrap completes without duplicate identities.
- [x] Hosted data contains source-backed chain-56 agents and keeps chain-97
      records correctly separated.
- [x] Mainnet and testnet incremental checkpoints advance independently.
- [x] Discovery, comparison, and profiles identify the agent network clearly.
- [x] The default judge journey surfaces eligible BSC mainnet agents.
- [x] Hiring remains restricted to the reviewed supported testnet path.
- [x] Freshness/source evidence is visible and stale data is not described as
      real-time.
- [x] The operator report proves current counts and checkpoints for each network
      after the hosted migration and mainnet bootstrap.
- [x] Index reruns are idempotent and partial failures resume safely.
- [x] No fabricated, relabelled, or privately sourced agent data is introduced.

## Testing Requirements

- Add focused unit tests for network parsing, links, filters, and wrong-network
  activation guards.
- Add indexer integration tests for dual checkpoints, idempotent replay,
  overlapping numeric agent IDs, and partial-range recovery.
- Browser-test discovery, profiles, and comparison on each supported network.
- Verify wrong-network and mainnet activation controls fail closed without a
  transaction request.
- Run `npm run lint`, typecheck, relevant tests, and `npm run build`.
- Run a read-only hosted smoke check and record observed counts/checkpoints.

## Definition of Done

M13 is complete when real BSC mainnet agents are independently indexed and
discoverable with current source/freshness evidence, testnet data remains
correctly isolated, the scheduled sync is healthy, all transaction controls
remain safely testnet-bound, and the acceptance evidence is documented.

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
