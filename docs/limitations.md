# Sift limitations

These limitations are product boundaries, not placeholder claims.

- The M13 application and database migration support independent BSC mainnet
  and testnet catalogues, but the hosted mainnet catalogue currently contains
  zero identities. Historical bootstrap is blocked on a reviewed,
  archive-capable free-tier BSC RPC URL.
- The hosted Supabase project was paused during M13 validation, so the additive
  M13 migration is not deployed. M13 routes that use its network-scoped RPC
  remain unavailable until the owner unpauses the project and the GitHub
  integration applies the migration.
- A passing recent-block RPC smoke test does not prove that a provider can read
  registry logs back to deployment block `79,027,268`. The operator report and
  caught-up checkpoint are the release evidence.
- ERC-8004 registration proves an identity event, not endpoint health,
  reputation, work quality, or ERC-8183 compatibility. Missing evidence remains
  unavailable or `Unknown`.
- Discovery defaults to production-chain identities. Hiring remains confined
  to the reviewed BSC Testnet ERC-8183/APEX path; mainnet profiles cannot start
  a wallet transaction.
- Existing records indexed before M13 have no registration transaction hash
  until a controlled source-backed replay observes it. Sift displays that value
  as unavailable and does not reconstruct it from assumptions.
- Public/free RPCs, GitHub Actions, Supabase, metadata hosts, and agent services
  may rate-limit or become unavailable. Checkpoints and timestamps disclose the
  last observed evidence instead of promising real-time state.
- The final public deployment, human-approved testnet hiring proof, two-wallet
  dashboard isolation check, and organizer eligibility answer remain external
  release gates documented in the milestone tickets.
