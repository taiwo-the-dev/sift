# Sift limitations

These limitations are product boundaries, not placeholder claims.

- The BSC Mainnet catalogue was current at checkpoint/confirmed head
  `121126225` on 2026-09-10. The reported count is approximate and is a timestamped
  observation, not a promise that the catalogue stays current without the
  incremental workflow.
- M14 category classification, its 12-agent validated shortlist, 12 bounded
  8004scan checks, and the hosted coverage report are populated and passing.
  Hosted runtime behavior confirms the required functions work, but an
  authenticated operator still needs to confirm the complete migration history.
- Bounded service, health, and score refreshes complete, but many third-party
  services are unavailable or lack enough current evidence. Scores and health
  remain unavailable rather than inferred when their evidence threshold is not met.
- 8004scan may omit fields, disagree, rate-limit, or become unavailable. It is
  optional validation only; Sift's own indexed identity remains the core.
- ERC-8004 registration proves an identity event, not endpoint health,
  reputation, work quality, or ERC-8183 compatibility. Missing evidence remains
  unavailable or `Unknown`.
- Discovery defaults to BSC Mainnet. Mainnet hiring can spend real assets and
  has no claimed human transaction proof for the release candidate.
- Altana protected hiring is implemented locally but is excluded from the
  mainnet release until compatible human safety evidence exists. The live
  session signer intentionally disappears on reload; its public KeyStore record
  remains inspectable and revocable. Passkey-wallet jobs are not yet accessible
  through the EOA-signed private dashboard.
- Existing records indexed before M13 have no registration transaction hash
  until a controlled source-backed replay observes it. Sift displays that value
  as unavailable and does not reconstruct it from assumptions.
- Public/free RPCs, GitHub Actions, Supabase, metadata hosts, and agent services
  may rate-limit or become unavailable. Checkpoints and timestamps disclose the
  last observed evidence instead of promising real-time state.
- The replacement public deployment, human-approved mainnet wallet checks,
  two-wallet dashboard isolation, novice sessions, license, and submission media
  remain external release gates documented in the milestone tickets.
