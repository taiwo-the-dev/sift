# Starting agent tasks

Sift does not assume every ERC-8004 identity can be hired. Registration proves
the identity exists; a recent successful service check proves which action Sift
can currently offer.

| Published method | What Sift offers | Safety boundary |
| --- | --- | --- |
| ERC-8183 | Protected hire | Existing signed quote, wallet approval, receipt, and contract-state verification |
| A2A | Send one task | User confirmation, one request, no automatic retry |
| MCP | Run a tool | Only a live tool declaring `readOnlyHint: true` |
| x402 | Review payment quote | Exact BNB network, token, recipient, and raw amount; no payment yet |

## Evidence lifecycle

The scheduled assessment workflow selects a bounded group of stale declared
services, validates their public protocol response, and records a sanitized
summary and timestamp. A successful observation is current for 24 hours. When
it expires, the **Available** discovery filter and **Start task** button stop
claiming the service is ready until another check succeeds.

The browser submits only a stored service ID. Sift resolves the endpoint on the
server, rejects unsafe/private destinations, rechecks the live protocol, limits
time and response size, and never invents a response.

## Hosted rollout

1. Review and deploy migration
   `20260908120000_add_agent_activation_evidence.sql` to hosted Supabase.
2. Add no new secrets; the checker uses the existing `SUPABASE_URL` and
   `SUPABASE_SECRET_KEY` GitHub Actions secrets.
3. Run `npm run check:activation:smoke`, then `npm run check:activation`.
4. Open Discover and select **Available**. Only recently verified services
   should appear.
5. Open a returned profile and test **Start task**. Approve only deliberate
   testnet wallet transactions in the protected-hire path.

The checker is also included in the existing six-hour assessment workflow. Its
limit, concurrency, timeout, and body size can be tuned through the documented
`ACTIVATION_CHECK_*` variables without adding paid infrastructure.

## Known boundary

x402 payment execution is intentionally not enabled. Showing a verified exact
quote is safe; sending funds needs a separately reviewed wallet flow that
enforces the displayed chain, asset, recipient, amount, and explicit user
approval.
