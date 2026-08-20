# TICKET-010 — M10 Dashboard

## Status

Ready

## Depends On

M9 — Hiring / Job Flow

## Objective

Create a connected-wallet dashboard at `/dashboard` that presents real active, pending, completed, and failed jobs, readable job details, verifiable activity, agent status, and only genuinely supported management actions.

## Product Context

Sift should feel like an ongoing control centre rather than a one-time marketplace. After hiring an agent, users need to understand what is active, what completed, what failed, what the agent has done, and which permissions or protocol controls remain available.

## Scope

- Create `/dashboard` with a safe disconnected state and connected-wallet data scope.
- Load persisted M9 jobs associated with the connected wallet and verify chain-linked status where required.
- Present supported summary values such as Active Jobs, Completed Jobs, Pending Jobs, and Total Activity using real records only.
- Build job collection views for active, pending, completed, failed/cancelled, and all jobs where useful.
- Build reusable job cards/rows showing applicable agent, mission, status, created/started time, expiry, permissions, network, and recent verified activity.
- Add job detail views or panels with transaction/job identifiers and explorer links.
- Add a readable chronological activity/audit timeline based on persisted or verifiable protocol/transaction events.
- Distinguish on-chain events, indexed observations, and application state.
- Refresh pending state responsibly using bounded polling, revalidation, or user-triggered refresh.
- Add supported Pause or Revoke actions only when the selected protocol exposes a real enforceable method and the action has been verified.
- For each management action, show review, explicit wallet confirmation, pending, confirmed, rejected, and failed states.
- Omit unsupported actions rather than rendering disabled controls that imply future capability.
- Add loading, empty, partial, stale, RPC-error, and database-error states.
- Support mobile dashboard and activity layouts.

## Out of Scope

- Fabricated KPI totals, timeline events, agent actions, transaction status, or performance.
- Unsupported pause/revoke simulations.
- Portfolio analytics, profit/loss, yield/APY reporting, or financial advice.
- Multi-wallet account systems, email authentication, teams, or organizations.
- Notifications, background push systems, or paid monitoring.
- New hiring protocols or new agent types.
- Production-polish work unrelated to the dashboard; M11 owns the full-system pass.

## Technical Requirements

- Scope dashboard queries to the actual connected wallet address and supported chain.
- Access jobs/activity through feature repositories/services, not direct queries scattered through components.
- Reconcile persisted state with verified transaction receipts/protocol events using explicit rules.
- Keep dashboard summary derivation pure, typed, and independently testable.
- Use Server Components for initial non-wallet-specific shells and narrow Client Components for wallet-scoped interaction.
- Bound polling frequency and stop polling terminal states or hidden/unmounted views.
- Use URL or route state for selected filters/details where shareability is appropriate without leaking sensitive information.
- Keep activity sources and timestamps normalized and ordered deterministically.
- Reuse M8 wallet/network handling and M9 transaction state utilities.
- Implement management writes with the same simulation, network, explicit-confirmation, receipt, and idempotency safeguards as M9.
- Preserve free-tier operation and avoid realtime infrastructure unless the existing free Supabase capability is justified.

## Data Integrity Requirements

- Derive KPI totals solely from real persisted jobs and documented status rules.
- Never fabricate activity descriptions, timestamps, transactions, agent actions, completion, or success.
- Label pending, stale, dropped, replaced, failed, and unknown states accurately.
- Link on-chain timeline entries to verifiable transaction/block references where possible.
- Distinguish an application-submitted mission from evidence that the agent executed or completed it.
- Do not show pause/revoke success until verified by receipt/protocol state.
- Treat missing recent activity as unavailable, not inactivity, unless the source proves it.

## Security Requirements

- Never expose another wallet's private job records due to client-controlled filtering.
- Enforce wallet ownership/access rules server-side where database policies apply.
- Validate all job IDs, wallet addresses, chain IDs, and management-action targets.
- Require explicit wallet approval for pause/revoke or any contract write.
- Never store or request private keys or seed phrases.
- Sanitize explorer links, activity payloads, agent metadata, and error messages.
- Do not leak server credentials, raw database errors, or RPC internals.

## UX Requirements

- Disconnected users must receive a clear explanation and connection action, not a broken dashboard.
- Summary values must have clear definitions and honest zero/unknown states.
- Users should quickly distinguish active, pending, completed, and failed jobs.
- Activity must be chronological, readable, and tied to provenance where possible.
- Pending jobs and writes require visible progress that survives reloads.
- Empty states must provide useful routes back to discovery.
- Unsupported actions must be omitted; supported destructive/revocation actions need clear consequences and confirmation.
- Mobile layouts must preserve status, mission, and actions without horizontal overflow.
- Keyboard navigation, focus, labels, and non-color status indicators are required.

## Acceptance Criteria

- [ ] `/dashboard` has coherent disconnected, wrong-network, connected, loading, empty, error, and populated states.
- [ ] The connected wallet sees only its correctly scoped persisted jobs.
- [ ] Active, completed, pending, and total activity values are derived from real data.
- [ ] Job cards/details show accurate mission, status, network, permissions, times, and identifiers where available.
- [ ] Activity timelines contain only recorded or verifiable events with correct ordering/provenance.
- [ ] Pending status can refresh without excessive polling.
- [ ] Pause/revoke appears only for a verified supported protocol action and uses explicit wallet confirmation.
- [ ] Unsupported management actions are absent.
- [ ] Mobile and desktop dashboard flows are accessible and responsive.
- [ ] No fabricated analytics, financial performance, or activity is displayed.
- [ ] Lint, typecheck, unit/integration tests, browser testing, and production build pass.

## Testing Requirements

- Unit-test status classification, summary aggregation, activity ordering, freshness, polling stop conditions, and action eligibility.
- Integration-test wallet-scoped job queries, access control, receipt reconciliation, and management-action persistence.
- Browser-test disconnected, wrong network, empty, populated, pending reload, failed job, activity detail, mobile layout, and any supported pause/revoke flow.
- Verify no cross-wallet data leakage using at least two labelled test wallets/fixtures.
- Test accessibility for status text, tables/lists, focus order, confirmations, and live pending feedback.
- Run `npm run lint`, typecheck, relevant tests, and `npm run build`.

## Definition of Done

M10 is complete when a connected user can safely understand all real persisted job states and evidence from a responsive dashboard, inspect accurate activity, perform only protocol-supported confirmed management actions, and no M11 general production-polish scope has been started automatically.

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
