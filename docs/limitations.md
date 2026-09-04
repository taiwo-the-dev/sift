# Sift limitations

These limitations are product boundaries, not placeholder claims.

- The BSC Mainnet bootstrap completed on 2026-09-03 with 331,747 indexed
  identities and checkpoint/confirmed head `119684064`. That is a timestamped
  observation, not a promise that the catalogue stays current without the
  incremental workflow.
- The M14 migration, category backfill, validated shortlist, stored 8004scan
  sample, and hosted coverage report are not deployed yet. The current local
  Supabase CLI identity lacks permission to link the active hosted project.
- 8004scan may omit fields, disagree, rate-limit, or become unavailable. It is
  optional validation only; Sift's own indexed identity remains the core.
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
