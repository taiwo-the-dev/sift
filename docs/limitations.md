# Sift limitations

These limitations are product boundaries, not placeholder claims.

- The BSC Mainnet bootstrap completed on 2026-09-03 with 331,747 indexed
  identities and checkpoint/confirmed head `119684064`. That is a timestamped
  observation, not a promise that the catalogue stays current without the
  incremental workflow.
- M14 category classification, its 12-agent validated shortlist, 12 bounded
  8004scan checks, and the hosted coverage report are populated and passing.
  The forward shortlist-function safety migration still needs hosted deployment.
- The latest bounded health refresh completed, but the catalogue-wide score
  candidate query timed out at current scale. Existing source-backed scores
  remain visible and missing scores remain `Unknown`; no replacement values are
  inferred.
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
