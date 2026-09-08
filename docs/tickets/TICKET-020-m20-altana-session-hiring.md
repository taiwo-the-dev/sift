# M20 — Altana Session Hiring

# Status

Implemented Locally; Human Testnet Evidence Pending

# Depends On

M9 — Hiring / Job Flow, M10 — Dashboard, and M19 — BSC Mainnet Hiring.

# Objective

Add a user-controlled Altana passkey-wallet option to Sift's existing ERC-8183
hiring flow. A buyer must be able to see a short-lived, budget-capped permission,
register it in Altana KeyStore, use it for a real atomic hire, and revoke it.

# Product Context

Sift helps users choose agents using evidence. The same standard should apply to
wallet authority: users should understand what an agent session can call, how
much it can spend, when it expires, and how to stop it. This milestone also
provides the live Altana session and transaction evidence requested by the Smart
Money Era Agent track while retaining Sift's non-custodial wallet path.

# Scope

- Pin and integrate the official Altana TypeScript SDK.
- Create or recover an Altana passkey wallet through a browser-only user action.
- Define one-hour hiring sessions limited to the reviewed ERC-8183 Commerce and
  Router functions, an exact token cap, and a bounded native-gas cap.
- Register sessions in Altana KeyStore and display their public status, expiry,
  limits, grant transaction, latest hire, and revoke transaction.
- Allow users to refresh and revoke a registered session from Sift.
- Keep ERC-20 approval outside session authority and approve only the exact
  signed job budget through the passkey admin.
- Build the atomic ERC-8183 call bundle with the official Altana SDK, fail closed
  on SDK/deployment drift, and execute the four safe hiring calls with the live
  session key.
- Verify the real receipt, two confirmations, registered historical KeyStore
  authority, all expected ERC-8183 events, and final funded job state before
  persistence.
- Preserve the original RainbowKit direct-wallet path.
- Provide a real-evidence Agent Advantage Report template and a beginner test
  runbook without inventing results.

# Out of Scope

- Automated mainnet writes or automated testnet signatures.
- Storing or transmitting passkey private material, seed phrases, or session
  private keys.
- Unlimited approvals, arbitrary call permissions, or background agent actions.
- Provider delivery, settlement, disputes, refunds, or autonomous trading.
- Passkey-wallet authorization for Sift's private dashboard.
- Claiming Altana eligibility without human-observed on-chain evidence.

# Technical Requirements

- Use `@altananetwork/sdk@0.7.1` and dynamically import it only in the client
  interaction boundary.
- Validate SDK KeyStore and ERC-8183 addresses against Sift's reviewed chain-56
  and chain-97 deployments before any action. Recognize the pinned SDK's exact
  documented older testnet policy, but explicitly supply Sift's current policy
  from the official BNB Agent SDK; reject any other drift.
- Use `grantSession({ register: true })`, public KeyStore reads, and
  `revokeSession` through the official SDK.
- Use the official `buildHireCalls`; remove exactly its one ERC-20 approval and
  reject any unexpected call-bundle shape.
- Reuse Sift's chain-isolated RPC, quote, receipt, database, and resume
  boundaries. No fabricated fallback may replace a failed chain read.
- Keep the generated live `Session` only in React memory. Local storage may hold
  only the public wallet credential handle, wallet address, public session key,
  limits, status, expiry, and transaction evidence.

# Data Integrity Requirements

- Never fabricate a wallet, session, KeyStore registration, call identifier,
  transaction, receipt, provider, agent, job, or test result.
- Mark a protected hire confirmed only after server verification of the selected
  chain and exact saved quote.
- Keep missing transaction hashes and unavailable KeyStore reads explicit.

# Security Requirements

- Never log or persist a session signer, private key, seed phrase, or passkey
  authentication assertion.
- Require a user gesture and OS passkey prompt for admin actions.
- Exclude `approve` from session call permissions because allowance can survive
  session revocation.
- Use an exact allowance, bounded spend permissions, bounded duration, supported
  chain allowlists, same-origin API checks, input size limits, and historical
  on-chain verification.
- Require an explicit real-funds acknowledgement before mainnet permission or
  hiring actions.

# UX Requirements

- Explain protected sessions in beginner-friendly language.
- Display allowed functions, token cap, gas cap, expiry, network, wallet, and
  revocation in the product before use.
- Keep errors recoverable and link real transactions to the correct BscScan.
- Clearly distinguish testnet tokens from real mainnet funds.

# Acceptance Criteria

- [x] Users can choose protected-session or connected-wallet hiring.
- [x] A passkey wallet can be created or recovered from Sift.
- [x] The exact session permission is visible before it is granted.
- [x] The session is registered by the official SDK and can be checked or revoked.
- [x] Session authority excludes token approval and unrelated contract calls.
- [x] The official ERC-8183 bundle is used and fails closed if its reviewed shape changes.
- [x] A protected hire is persisted only after independent receipt, event, funded-state, and historical KeyStore verification.
- [x] No private session material is written to local storage or a Sift API.
- [x] The existing direct-wallet flow remains available.
- [x] Unit, boundary, type, lint, and build validation exist.
- [ ] A human completes the BSC Testnet browser path and records real Altana/BNB explorer evidence.
- [ ] The hosted application passes the same permission, hire, and revoke path.

# Testing Requirements

- Unit-test reviewed addresses, permissions, spend caps, approval removal, SDK
  drift failure, KeyStore evidence, atomic ERC-8183 receipt events, and funded
  job state.
- Boundary-test that browser storage excludes private session material and that
  create, inspect, and revoke controls remain present.
- Run lint, strict typecheck, full unit/integration tests, wallet UI tests, and
  the production build.
- Perform real browser testing on BSC Testnet only by default. Never automate a
  mainnet transaction.

# Definition of Done

M20 is complete when automated validation passes, a human has created a bounded
testnet session, confirmed its KeyStore registration, hired a genuine compatible
agent through that session, verified the funded ERC-8183 job, revoked the
session, and recorded real explorer URLs in the evidence documents. Local code
completion alone must not be reported as real transaction completion.

# Codex Completion Report

Codex must report Status: PASS or BLOCKED, Implemented, Files Changed, Tests /
Validation, Important Decisions, Known Issues, Not Implemented, and Recommended
Next Step.

# Stop Condition

Do not implement the next milestone automatically.
