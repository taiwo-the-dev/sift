# M19 — BSC Mainnet Hiring

# Status

Implemented Locally; Hosted Validation Pending

# Depends On

M9 — Hiring / Job Flow, M10 — Dashboard, and M13 — BSC Mainnet Catalogue.

# Objective

Extend Sift's fail-closed ERC-8183/APEX hiring path from BSC Testnet to the
official BSC Mainnet deployment without weakening network isolation, wallet
consent, receipt verification, or data integrity.

# Product Context

Mainnet catalogue users should be able to hire a compatible agent without
switching to a different copy of that identity on testnet. Mainnet transactions
can move real assets, so the experience must make the network, budget, token,
contracts, gas cost, and irreversible nature of approvals unmistakable.

# Scope

- Add the official chain-56 APEX commerce, router, policy, and payment-token
  addresses from `bnb-chain/apex-contracts`.
- Resolve hiring configuration, server RPCs, wallet clients, quote validation,
  persistence, calldata/receipt verification, explorer links, and dashboard
  reads by the selected agent's chain.
- Continue supporting the reviewed chain-97 deployment independently.
- Require an explicit mainnet real-funds acknowledgement before saving a
  mainnet hiring intent.
- Continue exact token approvals and one explicit wallet confirmation per write.
- Add an additive Supabase migration allowing only chain IDs `56` and `97` in
  hiring and dashboard records.
- Update current architecture, setup, hiring, and limitation documentation.

# Out of Scope

- Custody, delegated signing, automatic transactions, or private-key handling.
- Unlimited token approvals.
- Sponsoring mainnet gas or payment tokens.
- Refund, dispute, pause, revoke, delivery, or settlement controls.
- Claiming a successful mainnet job without a real human-approved transaction.
- Supporting any chain or ERC-8183 deployment other than the reviewed chain-56
  and chain-97 configurations.

# Technical Requirements

- Use the existing wagmi, viem, RainbowKit, Next.js route-handler, and Supabase
  boundaries; add no dependency.
- Validate live bytecode, contract relationships, policy whitelist, pause state,
  payment-token metadata, platform fee, and dispute window before accepting a
  quote.
- Bind agent identity, quote, wallet, chain, contracts, token, amount, and expiry.
- Use only chain-specific `BNB_MAINNET_RPC_*` or `BNB_TESTNET_RPC_*` server
  variables and same-chain public fallbacks.
- Verify sender, destination, zero native value, calldata, receipt, expected
  events, confirmations, and final job state on the server.

# Data Integrity Requirements

- Never fabricate an agent, quote, token balance, transaction, receipt, job ID,
  or protocol state.
- Persist mainnet jobs only after validating the real indexed identity and signed
  provider quote.
- Keep missing or failed evidence explicit.

# Security Requirements

- Never receive or persist private keys, seed phrases, or wallet signing material.
- Require user confirmation for every write and exact allowance only when needed.
- Fail closed on unsupported networks, deployment drift, RPC mismatch, unsafe
  agent endpoints, invalid signatures, quote expiry, or receipt mismatch.
- Never run an automated mainnet write during tests or deployment.

# UX Requirements

- Show the selected network consistently throughout the flow.
- On mainnet, clearly state that gas and payment tokens can have real value.
- Display the exact token and destination contract before wallet actions.
- Link transactions and addresses to the correct chain-specific BscScan.
- Keep rejected, pending, replaced, resumed, and wrong-wallet states recoverable.

# Acceptance Criteria

- [x] Compatible chain-56 profiles can enter the hiring flow.
- [x] Chain-56 and chain-97 deployments and RPCs are isolated by type and runtime checks.
- [x] Mainnet quote/status documents must match the reviewed chain-56 deployment.
- [x] Mainnet review requires explicit real-funds acknowledgement.
- [x] Wallet calls, receipt verification, persistence, explorers, and dashboard use the job's chain.
- [x] Exact approvals and explicit per-write confirmations remain enforced.
- [x] The additive migration permits only chains `56` and `97` and preserves RLS.
- [ ] The migration is deployed to hosted Supabase.
- [ ] A human completes the browser test matrix without an automated mainnet write.

# Testing Requirements

- Unit-test chain configuration, URL routing, RPC isolation, compatibility,
  validation, binding, and receipt checks.
- Test the migration contract without modifying hosted data.
- Run typecheck, unit tests, wallet UI tests, lint, and build.
- Browser-test both networks with testnet transactions only unless the user
  separately chooses and approves a real mainnet transaction.

# Definition of Done

M19 is complete only when all code validation passes, the additive migration is
deployed, both network flows pass browser review, and no mainnet result is
claimed without independently verified evidence.

# Codex Completion Report

Report Status: PASS or BLOCKED, Implemented, Files Changed, Tests / Validation,
Important Decisions, Known Issues, Not Implemented, and Recommended Next Step.

# Stop Condition

Do not implement the next milestone automatically.
