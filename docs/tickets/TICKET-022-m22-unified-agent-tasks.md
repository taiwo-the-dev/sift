# M22 — Unified Agent Tasks

## Status

Implemented Locally; Hosted Migration and Live Service Validation Pending

## Depends On

M21 — Hiring UX and Evidence Clarity

## Objective

Let a user start work with an agent through the capability that agent actually
publishes, without pretending every ERC-8004 identity supports ERC-8183.

## Product Context

ERC-8004 proves an agent identity exists; it does not define one universal way
to hire or call that agent. Sift needs one understandable **Start task** entry
point that routes to protected ERC-8183 hiring, a live A2A endpoint, a safe
read-only MCP tool, or an x402 payment quote when genuine evidence exists.

## Scope

- Classify indexed ERC-8183, A2A, MCP, and x402 service declarations.
- Check declared public HTTPS services on a bounded scheduled job.
- Store method, freshness, latency, failure state, and a sanitized capability
  summary on each existing service record.
- Treat an agent as available only while a supported service check is current.
- Replace the metadata-keyword availability filter with stored live evidence.
- Add one profile-level **Start task** action and method-selection page.
- Preserve the existing ERC-8183 protected hiring route unchanged.
- Allow A2A messages only after the user confirms the request.
- Allow MCP execution only for tools declaring `readOnlyHint: true`.
- Inspect x402 challenges and show exact chain, asset, recipient, and amount;
  never pay automatically.

## Out of Scope

- Calling undeclared endpoints or guessing service URLs.
- Treating registration alone as proof that an agent can do work.
- Autonomous execution, custody, stored private keys, or background payments.
- Executing MCP tools without an explicit read-only annotation.
- Paying an x402 challenge without an exact cap and explicit wallet approval.
- Replacing or weakening ERC-8183 receipt verification.

## Technical Requirements

- Route handlers resolve service IDs server-side; clients cannot submit target
  URLs.
- Apply DNS/IP SSRF checks, HTTPS-only activation, bounded response bodies,
  timeouts, manual redirect validation, and no automatic retries for actions.
- Use JSON-RPC 2.0 for MCP Streamable HTTP and A2A endpoints.
- Keep protocol parsing and policy outside React components.
- Use official BNB Agent tooling for x402 policy where applicable; no paid
  provider is required.
- Scheduled checks are bounded and free-tier conscious.

## Data Integrity Requirements

- Never fabricate availability, tools, prices, replies, receipts, or service
  support.
- Persist only observed and sanitized evidence with an observation time and
  validation version.
- Expired evidence must no longer make an agent appear available.

## Security Requirements

- Reject credentials, query secrets, non-HTTPS endpoints, private/reserved IPs,
  cross-host redirects, oversized bodies, unsupported chains, and malformed
  responses.
- Never log authorization, payment, cookie, or session-key material.
- Revalidate the selected service immediately before an action.
- Do not retry A2A/MCP actions automatically; they may have side effects.

## UX Requirements

- Use plain labels: **Protected hire**, **Run a tool**, **Send a task**, and
  **Pay per request**.
- Explain what happens, what may cost money, and when evidence was checked.
- Do not show a clickable Start task control without a current supported method.
- Preserve accessible keyboard, focus, loading, error, and result states.

## Acceptance Criteria

- [x] Availability comes from a recent stored service check, not text search.
- [x] ERC-8183 routes to the existing protected hiring flow.
- [x] A2A resolves and revalidates a stored service before one confirmed POST.
- [x] MCP lists validated tools and runs only explicitly read-only tools.
- [x] x402 displays a validated exact quote and never pays automatically.
- [x] Arbitrary client URLs and private network targets are rejected.
- [x] Failures stay honest and do not substitute sample responses.
- [x] Tests cover classification, parsers, policy, migration, and boundaries.
- [x] Lint, typecheck, tests, build, and development startup pass.

## Testing Requirements

Unit-test service classification, freshness, protocol parsing, read-only policy,
x402 quote validation, and bounded bodies. Integration-test the migration and
service-ID boundary. Browser-test loading, confirmation, error, and result states
where genuine services exist. Run lint, typecheck, tests, build, and dev startup.

## Definition of Done

M22 is complete when a user sees only current supported task methods, can use
protected ERC-8183 or explicitly invoke a validated direct service, and can
inspect an exact x402 quote without Sift overstating support or spending funds.

## Codex Completion Report

Codex must report: Status (PASS or BLOCKED), Implemented, Files Changed,
Tests / Validation, Important Decisions, Known Issues, Not Implemented, and
Recommended Next Step.

## Stop Condition

Do not implement the next milestone automatically.
