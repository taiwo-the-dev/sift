# TICKET-015 — M15 Frictionless Agent Activation Proof

## Status

Blocked on Genuine Studio Agent Supply and Human Testnet Evidence

## Depends On

M14 — Category Parity & Decision-Grade Data

## Objective

Prove that a person with no Agent Studio knowledge can move from any required
category to a compatible agent, understand the commitment, activate it through
the reviewed BNB-supported testnet path, and recover or monitor the result
without a dead end.

## Product Context

Sift already has a guarded ERC-8183/APEX hiring implementation, but code and
unit tests are not proof that the judged journey works. The official
functionality criterion explicitly ends at activation. The release needs real,
human-approved transaction evidence and predictable handling of unsupported,
rejected, pending, reloaded, and confirmed states.

## Scope

- Define a source-backed activation-compatibility contract covering network,
  agent identity/owner, service type/version, endpoint/quote, escrow deployment,
  token, allowance, and job relationship.
- Install and use the current official BNB Agent Studio CLI and TypeScript SDK
  according to the official documentation, recording exact versions and
  commands without adding unused runtime dependencies to Sift.
- Validate at least one genuine persistent Agent Studio agent from ERC-8004
  discovery through its declared ERC-8183 task interface and Sift activation.
  Prefer an existing live agent; any new external deployment requires explicit
  approval and must remain real, labelled, funded safely, and available during
  the claimed judging window.
- Identify at least one real representative agent in each required category
  that can complete the supported testnet activation path. If a category lacks
  compatible supply, coordinate with real agent owners/organizers or report the
  milestone blocked; never create fake records.
- Provide a clear Find → Understand → Configure → Review → Connect/Switch → Sign
  → Confirm → Monitor flow with minimal protocol terminology.
- Show price, token, recipient/contract, requested permissions, chain, and
  irreversible effects before any signature.
- Keep explicit human approval for every transaction and preserve the current
  verified contract/address binding.
- Execute and record at least one complete real BSC Testnet activation/job with
  transaction receipt, job ID, indexed agent identity, timestamps, and dashboard
  recovery.
- Use the official BSC Testnet network configuration, faucet procedure, and
  explorer for the disposable validation wallet and receipt evidence.
- Exercise the representative flow for every category; a category may reuse the
  same reviewed protocol only when its real agent declares that support.
- Make unsupported agents useful rather than broken: explain why activation is
  unavailable and provide a route back to compatible alternatives.
- Preserve form progress across wallet account changes while invalidating stale
  quotes, approvals, signatures, and wallet-scoped session state.
- Verify rejection, wrong network, stale quote, RPC interruption, pending reload,
  duplicate-click prevention, confirmed reload, and dashboard handoff.
- Update hiring, wallet, dashboard, demo, and release documentation with exact
  supported behavior and explorer links.

## Out of Scope

- Mainnet payments or mainnet hiring.
- Custody, private-key handling, autonomous signing, delegated session keys, or
  unlimited token approvals.
- Pretending a funded escrow means an agent completed useful work.
- Implementing Altana, PancakeSwap, TermiX, x402/B402 commerce, dispute/refund,
  pause/revoke writes, or protocols not already reviewed.
- Automatically deploying a new agent or modifying third-party agent services.

## Technical Requirements

- Continue using wagmi/viem and the existing verified BSC Testnet deployment.
- Resolve Agent Studio package names, versions, authentication, and supported
  service conventions from current official docs when implementation begins;
  do not invent SDK APIs from this ticket.
- Keep Agent Studio CLI/scaffolding out of the production web bundle unless an
  official consumer package is demonstrably needed at runtime.
- Re-read the installed Next.js guidance before changing routes or server/client
  boundaries.
- Derive transaction targets and calldata only from verified configuration and
  validated agent/service responses; never accept arbitrary browser-supplied
  addresses as trusted configuration.
- Bind quotes and resumable workflow state to chain, account, agent, job, amount,
  contract, nonce/expiry where available, and server-validated relationships.
- Persist transaction lifecycle states idempotently and reconcile receipts after
  reload without duplicate writes or duplicate signature prompts.
- Use finite approval amounts required by the reviewed job only.
- Preserve wallet-scoped dashboard challenge/signature verification and session
  isolation.
- Keep all reads and writes observable with sanitized structured logs.

## Data Integrity Requirements

- Use only real indexed agent identities, real service declarations, real
  quotes, and real testnet receipts.
- Link claims to the correct chain explorer and transaction hash.
- Distinguish submitted, pending, confirmed, failed, rejected, expired, and
  agent-work completion states.
- Do not claim success from a mocked provider, local fixture, screenshot, or
  transaction hash that was not independently read from BSC Testnet.
- Do not claim agent quality or delivered output based only on job creation.

## Security Requirements

- Never request, store, log, or transmit a seed phrase/private key.
- Require chain ID 97 and the verified contracts before a write request.
- Revalidate account/chain after every wallet event and before every signature.
- Reject stale or mismatched quote, owner, job, token, contract, and session data.
- Make transaction rejection safe and resumable without silently retrying.
- Test authorization isolation with two wallets and protect wallet-scoped jobs
  through server-verified signatures.

## UX Requirements

- A new user can understand each step without knowing ERC-8004 or ERC-8183.
- Progress, required wallet actions, expected testnet cost, and current state are
  always visible.
- Account/network changes explain what was preserved and what must be refreshed.
- Back, cancel, replace-agent, and resume paths are available where safe.
- No enabled Hire/Activate button may lead to a known unsupported dead end.
- Transaction and error copy is actionable, calm, and chain-specific.

## Acceptance Criteria

- [x] Compatibility rules are documented, centralized, and tested.
- [ ] The official Agent Studio CLI/TypeScript SDK is used meaningfully and its
      exact version/commands are recorded.
- [ ] A genuine Agent Studio agent's ERC-8004 identity and ERC-8183 task
      interface are verified through Sift.
- [x] At least one real compatible representative exists for each required
      category, or M15 is reported BLOCKED with source evidence.
- [ ] A novice can complete the full category-to-monitor path without external
      Agent Studio instructions.
- [ ] One complete human-approved BSC Testnet activation/job has a verified
      receipt, job ID, persisted state, and dashboard recovery record.
- [x] The disposable wallet procedure uses official BSC Testnet network,
      faucet, and explorer resources without exposing wallet secrets.
- [ ] Every category representative reaches an honest activation outcome.
- [x] Unsupported agents provide explanation and compatible alternatives rather
      than broken controls.
- [x] Wallet changes preserve safe form progress and invalidate wallet-bound
      data correctly.
- [ ] Rejection, wrong-network, stale, pending, reload, failure, and duplicate
      submission paths behave safely.
- [ ] A second wallet cannot view or resume the first wallet's private job.
- [x] No private key, autonomous transaction, mainnet write, fabricated receipt,
      or unlimited approval is introduced.

## Implementation Note — 2026-09-05

The repository-side compatibility contract, SDK deployment check, read-only CLI
verification path, recovery UX, dashboard handoff, and evidence procedure are
implemented. The installed official versions are Agent Studio CLI `0.0.13` and
TypeScript SDK `0.5.5`, both development-only.

M15 is not complete. Sift has no supplied genuine persistent Studio project for
the CLI identity check, no verified activatable representative for every
required category, and no human-approved BSC Testnet receipt/job/dashboard
record. M14 is also still blocked on its hosted evidence prerequisites. See
`docs/activation-proof.md`; do not convert any unchecked acceptance item to a
pass without real source evidence.

The bounded 2026-09-05 hosted readiness run verified the chain-97 deployment,
but six real yield/grid candidates returned invalid status documents and the
search returned no health-factor or liquidity-rebalancing candidate. This is
recorded as blocked supply rather than replaced with fabricated agents.

## Testing Requirements

- Unit-test compatibility, quote/state binding, account/network invalidation,
  and lifecycle transitions.
- Integration-test server validation, receipt reconciliation, idempotency, and
  two-wallet isolation.
- Browser-test the complete flow with wallet rejection, switching, reload, and
  confirmation using a disposable funded testnet wallet.
- Manually verify recorded transaction links against BscScan Testnet.
- Run `npm run lint`, typecheck, relevant tests, and `npm run build`.

## Definition of Done

M15 is complete when official Agent Studio tooling has proved compatibility with
a genuine Studio agent, the real BSC Testnet activation journey is
understandable, safe, recoverable, and receipt-proven, each required category
has a genuine route to an activation outcome, and no core-path control leads to
a concealed dead end.

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
