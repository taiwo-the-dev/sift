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
summary and timestamp. A successful observation is current for 24 hours.

The **Start task** button and the per-agent **Available** badge require that
current successful observation: when it expires or the check fails, they stop
claiming the service is ready until another check succeeds.

The **Available** discovery filter is slightly wider. It returns an agent whose
declared activation service either has a current successful check or has not
yet been probed (`availability_status = 'unchecked'`), so the filter is useful
before the bounded queue has reached the whole catalogue. A service that was
probed and came back degraded, unavailable, or unsupported, and a stale
successful observation, are both excluded. This keeps the filter honest — it
never shows an agent whose service failed a check — without making it depend on
a backlog clearing first. `20260908130000_ready_filter_declared_fallback.sql`
carries this rule.

The browser submits only a stored service ID. Sift resolves the endpoint on the
server, rejects unsafe/private destinations, rechecks the live protocol, limits
time and response size, and never invents a response.

## Hosted rollout

1. Review and deploy migrations
   `20260908120000_add_agent_activation_evidence.sql` and
   `20260908130000_ready_filter_declared_fallback.sql` to hosted Supabase.
2. Add no new secrets; the checker uses the existing `SUPABASE_URL` and
   `SUPABASE_SECRET_KEY` GitHub Actions secrets.
3. Run `npm run check:activation:smoke`, then `npm run check:activation`.
4. Open Discover and select **Available**. Agents with a supported declared
   task service appear immediately; once the checker runs, any whose service
   fails a live check drop out.
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
