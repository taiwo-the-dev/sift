# M23 — Multi-Service Agent Access

## Status

Implemented Locally; Hosted Migration and Human Wallet Validation Pending

## Depends On

M22 — Unified Agent Tasks

## Objective

Let Sift users access the genuine services an agent publishes without requiring
every agent to implement ERC-8183 or weakening transaction safety.

## Product Context

ERC-8004 agents use different ways to accept work. Some support protected
ERC-8183 hiring, while others expose A2A, MCP, x402, or an external application.
Sift should present the method the agent actually supports through one clear
**Start task** journey. Registration alone must never be shown as proof that an
agent can perform a task.

## Scope

- Accept a successfully inspected MCP tool list even when its publisher omitted
  the optional read-only annotation.
- Keep annotated read-only MCP tools as one-click calls.
- Require a separate confirmation before calling any MCP tool that is not
  explicitly read-only.
- Extract only structurally valid BSC Mainnet or BSC Testnet transaction requests
  returned by an MCP tool.
- Simulate every extracted transaction and require explicit approval in the
  connected wallet; never sign or broadcast automatically.
- Show validated public external services when an eligible agent does not expose
  a directly supported task protocol.
- Keep the scheduled availability checker fair across supported networks and
  task methods so one large queue cannot starve the others.
- Preserve existing ERC-8183, A2A, and x402 behavior.

## Out of Scope

- Claiming that an identity with no working service can be used.
- Guessing endpoints or capabilities that the agent did not publish.
- Automatically signing transactions, approving tokens, moving funds, or
  accepting an x402 payment.
- Treating an arbitrary external website as a Sift-verified execution result.
- Bypassing provider permissions, payment rules, or wallet confirmation.
- Custody of user keys or funds.

## Technical Requirements

- Resolve service identifiers and the agent chain on the server; never accept an
  executable endpoint or target chain directly from the browser.
- Re-inspect the live MCP service and selected tool immediately before calling it.
- Reuse the existing HTTPS, DNS/IP SSRF, redirect, response-size, and timeout
  protections.
- Make at most one external tool call for one user submission and do not retry it
  automatically.
- Bound traversal of untrusted responses and accept transaction targets, calldata,
  values, and chain identifiers only after strict EVM validation.
- Use the existing wagmi/viem wallet boundary and add no paid service.
- Keep protocol policy outside presentation components.

## Data Integrity Requirements

- Never fabricate service support, tool definitions, availability, results, or
  transaction requests.
- Store and display only observed capability evidence with its check time and
  validation version.
- Expired or failed evidence must not make a direct task method available.
- External service links must come from validated agent metadata and be described
  as provider-controlled.

## Security Requirements

- Block invalid, inactive, or unavailable agent services.
- Require same-origin API requests and server-side service lookup.
- Require explicit confirmation for every MCP tool not marked read-only.
- Reject malformed transaction data and transactions for another network.
- Simulate a valid transaction before opening the wallet approval request.
- Never log or store private keys, signatures, authorization headers, or payment
  credentials.

## UX Requirements

- Use one **Start task** action for supported task methods and clearly name the
  selected method.
- Explain the difference between a read-only tool, an external action, and a
  wallet transaction.
- Generate an editable JSON argument template only from the live published tool
  schema.
- Show target network, contract, value, and calldata before wallet approval.
- Give honest empty, loading, failure, result, and transaction states.

## Acceptance Criteria

- [x] An inspected MCP service with at least one valid tool can become available
  even when none of its tools declares `readOnlyHint`.
- [x] Non-read-only MCP calls are blocked until the user confirms possible side
  effects.
- [x] The server revalidates the stored service and live tool before one call.
- [x] Returned transactions are limited to the registered BNB network and valid
  EVM fields.
- [x] No returned transaction is submitted without simulation and wallet approval.
- [x] Eligible agents with ordinary HTTPS services can expose those provider links
  without being presented as verified in-app execution.
- [x] Invalid and inactive profiles cannot expose the new Start task action.
- [x] The availability checker gives unchecked services priority and distributes
  its bounded batch across networks and methods.
- [x] No fabricated capabilities or fallback task results are introduced.
- [x] Strict TypeScript, lint, relevant tests, and production build pass.

## Testing Requirements

Unit-test MCP discovery, confirmation policy, response parsing, chain rejection,
and transaction extraction. Test the migration's bounded, service-role-only queue.
Render-test read-only and confirmation-gated forms. Run lint, strict typecheck,
the complete automated test suites, production build, and development startup.
Complete one human wallet review using a real low-risk agent/tool before marking
the hosted milestone fully complete; do not broadcast a value-bearing transaction
solely for validation.

## Definition of Done

M23 is complete when the hosted migration is applied, a real unannotated MCP agent
is shown as available after a successful check, its tool can prepare an action only
after confirmation, any returned BNB transaction requires simulation and wallet
approval, and all required validation passes.

## Codex Completion Report

Codex must report: Status (PASS or BLOCKED), Implemented, Files Changed,
Tests / Validation, Important Decisions, Known Issues, Not Implemented, and
Recommended Next Step.

## Stop Condition

Do not implement the next milestone automatically.
