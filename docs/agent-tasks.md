# Starting agent tasks

Sift does not assume every ERC-8004 identity can be hired. Registration proves
the identity exists; a recent successful service check proves which action Sift
can currently offer.

| Published method | What Sift offers | Safety boundary |
| --- | --- | --- |
| ERC-8183 | Protected hire | Existing signed quote, wallet approval, receipt, and contract-state verification |
| A2A | Send one task | User confirmation, one request, no automatic retry |
| MCP | Run a tool | Published fields, confirmation for tools not marked read-only, and wallet review for transactions |
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

Successful A2A and MCP results are presented in a readable field-and-list view
by default. The exact unmodified response remains available in a collapsed
**View JSON response** panel for technical users and troubleshooting.

Sift preserves agent-specific A2A card URLs and sends the selected ERC-8004
identity as message metadata. A host-specific routing token is sent only when
the card explicitly declares it. When a provider returns identity information
instead of task output, Sift labels that limitation rather than claiming the
task was completed.

The task form follows the selected protocol. For A2A, it lists capabilities from
the latest successful check and includes the selected capability ID only when it
is still present on the live card reloaded before submission. A2A does not
provide a general field schema, so Sift keeps the message free-form instead of
inventing asset, amount, or strategy fields. For MCP, Sift converts the tool's
published JSON Schema into labelled text, number, boolean, option, object, and
list controls, marks required inputs, applies published bounds, and omits
untouched optional values. Object and list inputs remain JSON because that is
the exact type the tool declares.

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
5. Open a returned profile and test **Start task**. Mainnet actions can spend
   real assets, so stop before wallet approval unless the owner has reviewed the
   exact contract, token, amount, and network and intends to proceed.

The checker is also included in the existing six-hour assessment workflow. Its
limit, concurrency, timeout, and body size can be tuned through the documented
`ACTIVATION_CHECK_*` variables without adding paid infrastructure.

## Known boundary

x402 payment execution is intentionally not enabled. Showing a verified exact
quote is safe; sending funds needs a separately reviewed wallet flow that
enforces the displayed chain, asset, recipient, amount, and explicit user
approval.
