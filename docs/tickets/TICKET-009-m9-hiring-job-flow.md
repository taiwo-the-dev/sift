# TICKET-009 — M9 Hiring / Job Flow

## Status

Ready

## Depends On

M8 — Wallet Integration

## Objective

Implement a real BSC Testnet hiring/job workflow that lets a user define a mission, configure only enforceable permissions, review the exact action, confirm it through their wallet, and persist the resulting on-chain job and transaction state.

## Product Context

Sift's marketplace becomes actionable when a user can move from selecting an agent to creating a transparent, bounded mission. The flow must feel like a modern checkout, hide unnecessary contract complexity, and never imply that a permission or job exists before the underlying protocol and wallet confirm it.

## Scope

- Verify the current BNB-supported agent commerce/job mechanism, including ERC-8183 where applicable, from official specifications and deployed contract documentation before implementation.
- Document the selected protocol version, chain, contracts, ABI, limitations, and why it is appropriate.
- Add any required versioned database migration for `jobs`, job transactions, and minimal activity records.
- Create `/hire/[agentId]` or the canonical chain-aware equivalent.
- Build a step-based flow:
  1. Define Mission;
  2. Configure Permissions;
  3. Review;
  4. Wallet Confirmation;
  5. Confirmation.
- Resolve the selected real agent and supported service/commerce capabilities.
- Validate mission text, expiry, duration, maximum spend, approved protocols/contracts, permitted actions, and other fields only when the selected protocol can enforce them.
- Omit controls that cannot be enforced by the chosen contract or agent interface.
- Present an exact review summary including agent, mission, network, permissions, maximum spend, expiry, and known fees/costs.
- Require BSC Testnet and explicit wallet approval.
- Implement typed viem contract reads, simulation where supported, write preparation, submission, receipt waiting, and failure/replacement handling.
- Persist a pending job intent safely, then update it from the verified transaction receipt/job identifier.
- Make submission idempotent and prevent accidental duplicate job creation.
- Display transaction hash, job identifier, agent, mission, network, status, and sanitized explorer link on confirmation.
- Add resumable pending/submitted/confirmed/failed/replaced states for reloads.
- Document the full testnet demo procedure and funding prerequisites.

## Out of Scope

- Mainnet financial deployment or real-value hiring.
- Custodial execution, server-held signing keys, or automatic wallet approval.
- UI controls for permissions that the contract/agent cannot enforce.
- Dashboard aggregation and ongoing job management beyond the confirmation/status needed for this flow.
- Pause/revoke controls unless strictly required to complete the selected job protocol; dashboard exposure belongs to M10.
- Fabricated job IDs, fees, receipts, statuses, transactions, or activity.
- Custom agent implementation or a new commerce protocol.
- Authentication unrelated to the connected wallet.

## Technical Requirements

- Use viem/wagmi contract interactions through a dedicated typed hiring feature boundary.
- Verify current protocol documentation and deployment addresses at implementation time; never rely on recalled addresses or stale examples.
- Keep ABIs, chain IDs, contract addresses, and supported capabilities typed and documented.
- Simulate transactions before requesting signatures where the protocol supports simulation.
- Validate active chain immediately before simulation and submission.
- Use explicit state transitions for draft, awaiting_wallet, submitted, confirmed, failed, cancelled, and replaced where supported.
- Persist canonical chain ID, wallet address, agent reference, job/mission inputs, transaction hash, block/receipt data, and timestamps.
- Verify receipts server-side or against a trusted configured RPC before marking a job confirmed.
- Use unique idempotency identifiers and database constraints to avoid duplicate persistence.
- Keep financial values in integer base units internally; never use floating-point arithmetic for token amounts.
- Handle token decimals, allowance/approval requirements, fees, and native/token value only if the selected protocol genuinely requires them.
- Keep free-tier constraints and BSC Testnet development preference.

## Data Integrity Requirements

- Never fabricate transaction hashes, job identifiers, receipts, statuses, fees, balances, approvals, or activity.
- Mark jobs submitted/confirmed only from actual wallet/provider and chain evidence.
- Keep user-entered mission and permission values exactly auditable after normalization.
- Display estimates as estimates and only when derived from a real source.
- Preserve failed, cancelled, dropped, and replaced transaction states honestly.
- Do not claim an off-chain agent accepted or completed work unless supported evidence exists.
- Do not infer permissions beyond the exact encoded contract call.

## Security Requirements

- Never store private keys, seed phrases, or signing material.
- Require explicit wallet confirmation for every transaction and approval.
- Never auto-submit a financial transaction on page load or network change.
- Validate all addresses, token amounts, durations, expiry, permission targets, and contract calls server-side and client-side.
- Allowlist supported chain IDs and verified protocol contracts.
- Show the user the destination contract, network, value, approvals, and enforceable restrictions before signing.
- Protect against duplicate submission, stale simulation, wrong network, amount overflow/underflow, decimal mistakes, and unsafe external links.
- Do not request unlimited token approval unless the protocol strictly requires it and the user is clearly warned; prefer exact approvals.
- Sanitize wallet and RPC errors before display/logging.

## UX Requirements

- Present the flow as a clear modern checkout with progress and the ability to go back before signing.
- Explain each enforceable permission in plain language.
- Review must make agent, network, amounts, expiry, permissions, contract destination, and known fees unambiguous.
- Wallet rejection, network mismatch, simulation failure, insufficient funds, submission, pending, confirmation, replacement, and failure states need actionable messaging.
- Prevent double-click duplicate submissions and show persistent pending feedback.
- Confirmation must offer explorer access and a route toward the future dashboard.
- Mobile users must be able to complete the full flow without clipped review tables or hidden actions.

## Acceptance Criteria

- [ ] The selected BNB-supported job protocol and testnet deployment are verified and documented.
- [ ] A real indexed compatible agent can enter the hire flow.
- [ ] Mission and only enforceable permission fields are validated.
- [ ] Review accurately shows the exact planned chain action.
- [ ] Wrong-network and disconnected states are blocked safely.
- [ ] The contract call is simulated where supported before wallet confirmation.
- [ ] The user explicitly confirms the BSC Testnet transaction in their wallet.
- [ ] Submitted, pending, confirmed, rejected, failed, and replaced states are handled.
- [ ] A confirmed job record is linked to a real receipt, transaction hash, and job identifier where the protocol provides one.
- [ ] Duplicate submissions do not create duplicate jobs.
- [ ] Confirmation displays accurate explorer and job details.
- [ ] No mainnet, dashboard, or unsupported permission work is introduced.
- [ ] Lint, typecheck, unit/integration tests, testnet browser testing, and production build pass.

## Testing Requirements

- Unit-test mission/permission validation, base-unit conversion, state transitions, idempotency keys, review formatting, and receipt mapping.
- Integration-test job persistence, duplicate prevention, receipt verification, and failure/replacement updates.
- Test contract reads/simulation against deterministic fixtures and the verified BSC Testnet deployment.
- Browser-test the full happy path plus disconnect, wrong network, wallet rejection, simulation failure, insufficient funds where practical, pending reload, confirmation, and duplicate-click prevention.
- Use a documented disposable testnet wallet procedure; never commit its private key.
- Run `npm run lint`, typecheck, relevant tests, the testnet smoke flow, and `npm run build`.

## Definition of Done

M9 is complete when a user can configure a real enforceable mission for a compatible indexed agent, review and explicitly approve a BSC Testnet job transaction, receive accurate pending/final states, and see a persisted job tied to verified chain evidence, without implementing the M10 dashboard automatically.

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
