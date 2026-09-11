# M24 — Complete Agent Execution

## Status

In Progress

## Depends On

M23 — Multi-Service Agent Access

## Objective

Complete Sift's method-aware execution paths for valid BNB Chain agent services:
ERC-8183 protected hiring, A2A tasks, MCP tools, x402 paid requests, and safe
handoff to provider-controlled Web applications.

## Product Context

Discovery is useful only when a user can continue through the method an agent
actually publishes. Sift must make that path clear and usable without pretending
that every third-party endpoint is online, standards-compliant, or safe.

## Scope

- Preserve the existing ERC-8183 protected-hire flow and its wallet receipt checks.
- Preserve confirmed A2A task submission and readable results.
- Preserve schema-driven MCP tool forms, explicit side-effect confirmation, and
  wallet simulation/review for returned BNB Chain transactions.
- Upgrade x402 from quote-only review to an exact, wallet-signed paid request.
- Support BNB-compatible x402 v1 and v2 exact-payment challenges.
- Re-read the live x402 challenge before signing and again before execution.
- Display the payment token, human-readable amount, recipient, network, connected
  wallet balance, and settlement evidence where the provider returns it.
- Keep Web access as an explicit handoff to the agent owner's published HTTPS app.
- Add focused protocol, route-boundary, and UI tests.

## Out of Scope

- Making broken, offline, private, or non-standard third-party services work.
- Automatic wallet signing, automatic payment, custody, stored private keys, or
  unlimited token approvals.
- Executing arbitrary URLs supplied by the browser.
- Supporting non-BNB networks or payment schemes other than x402 `exact`.
- Guaranteeing the correctness or quality of a third-party agent's output.

## Technical Requirements

- Use the official open-source x402 core and EVM implementations.
- Resolve every executable endpoint from the indexed service ID on the server.
- Keep outbound request SSRF protection, response-size bounds, timeouts, and
  redirect rejection in place.
- Support the CAIP-2 BNB identifiers used by current BNB x402 agents, including
  legacy v1 challenges that publish `eip155:56` or `eip155:97`.
- Keep signing in the connected browser wallet. The server may relay only a
  bounded, already signed payment authorization to the revalidated endpoint.
- Keep Server Components as the default outside interactive wallet UI.

## Data Integrity Requirements

- Never fabricate service availability, results, payments, settlement hashes, or
  transaction success.
- Label settlement evidence as unavailable when a provider omits it.
- Never infer a working protocol merely from ERC-8004 registration metadata.

## Security Requirements

- Require same-origin POST requests at Sift API boundaries.
- Validate service eligibility and current availability before every action.
- Bind an x402 authorization to the live chain, token, exact amount, recipient,
  wallet address, nonce, and short expiry.
- Require explicit user confirmation and one wallet signature per payment.
- Never forward a client-provided endpoint or payment to a different live quote.
- Explain that timeout after authorization can be indeterminate; do not silently
  retry a paid request.

## UX Requirements

- Use a details, review, wallet approval, and result flow for paid requests.
- Show human-readable token amounts rather than raw units as the primary value.
- Explain plainly when the wallet is disconnected, on the wrong network, or lacks
  the requested token balance.
- Render agent responses readably while retaining an optional raw JSON view.
- External Web links must clearly open the provider's app in a new tab.

## Acceptance Criteria

- [ ] ERC-8183 still reaches the protected-hire flow.
- [ ] A2A still sends a confirmed task and renders the returned result.
- [ ] MCP still validates live tools and requires confirmation for side effects.
- [ ] MCP-returned transactions remain simulated and wallet-approved individually.
- [ ] A valid BNB x402 v1 exact challenge can be signed by the connected wallet.
- [ ] A valid BNB x402 v2 exact challenge can be signed by the connected wallet.
- [ ] The signed x402 request is retried only against the indexed, revalidated URL.
- [ ] A successful paid resource and any settlement evidence are shown to the user.
- [ ] Insufficient balance, changed quotes, rejected signatures, provider failures,
  and indeterminate timeouts produce honest, actionable errors.
- [ ] Web-only agents retain a safe external handoff.
- [ ] No secret or private key is added to the repository.

## Testing Requirements

- Unit-test x402 challenge filtering, v1/v2 payload construction, quote binding,
  payment headers, and result parsing.
- Keep existing activation protocol and wallet UI tests passing.
- Run TypeScript checking, lint, the relevant test suites, and production build.
- Browser-test the non-spending paths. A real paid request requires the wallet
  owner's explicit approval and tokens and must be recorded separately.

## Definition of Done

M24 is complete when all automated checks pass, every supported method has a clear
execution or handoff path, and a human can explicitly approve a standards-compliant
BNB x402 payment and receive its real response. If no funded wallet is available,
the implementation may be complete locally but live paid validation remains
pending and must not be reported as a successful payment.

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
