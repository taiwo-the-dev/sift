# Agent health and Sift Score

M6 adds two separate evidence systems: bounded endpoint observations and a pure, versioned score calculation. Neither system executes an agent action, sends user data, or invents a missing signal.

## Evidence audit

The formula was finalized after a read-only audit of the hosted BSC Testnet catalogue on 2026-08-22. The snapshot contained 1,890 agents and 1,100 declared services, with no existing health, reputation, or score rows. Of those agents, 947 had currently valid metadata, 916 had a description, 217 had an image, and 725 declared at least one service. No canonical Sift category or supported job-history source was populated.

The service declarations included 478 `A2A` and 46 `MCP` records, plus generic web and protocol-specific declarations. Only these targets are considered meaningful health checks in M6:

- an explicit `health` service with a safe public HTTPS endpoint;
- an `A2A` service whose public HTTPS path ends in `/.well-known/agent-card.json`.

Generic web, MCP, blockchain, DID, IPFS, ERC-8183, and other declarations are not probed. Reachability of those values would not reliably describe agent health, and some require protocol actions that M6 must not execute.

These counts are an audit snapshot, not hard-coded product data. The implementation always calculates from current persisted evidence.

## Health observations

Run a configuration-only smoke check:

```bash
npm run check:smoke
```

Run one bounded assessment batch after the M6 migration is deployed:

```bash
npm run check:agents
```

Defaults are deliberately free-tier conscious: 20 due agents, concurrency 3, a 5-second timeout, one retry, a 64 KiB response limit, and a six-hour minimum interval. Environment overrides are documented in `.env.example` and have hard maximums.

The server-only queue selects the least recently checked identities first to prevent starvation, then prioritizes agents with an existing score and recently registered agents. It considers only valid metadata with a potentially supported HTTPS service declaration. The checker independently validates each declaration; unsupported, invalid, or unsafe targets remain `Unknown` and receive no request.

An eligible probe:

- uses `GET` only and never sends secrets, wallet data, user data, or a request body;
- permits HTTPS on the standard port only, without embedded credentials or query parameters;
- blocks localhost, private, link-local, reserved, placeholder, and unsafe DNS destinations;
- validates every redirect and allows no more than two;
- bounds concurrency, retries, duration, and response bytes;
- requires a 2xx response; A2A discovery additionally requires a JSON object response.

`Online` means the latest bounded check succeeded. `Degraded` represents a retryable HTTP response. `Offline` represents a timeout or network failure. `Unknown` covers unsupported, unsafe, invalid, or semantically unusable responses. These labels describe one endpoint observation, not agent safety or guaranteed availability.

The `agent_health` row preserves last success, latest outcome, response time when measured, a bounded consecutive failure count, and bounded successes/checks for the current endpoint fingerprint. A changed endpoint resets endpoint-specific counts. Historical counts compact at 1,000 observations rather than growing without limit.

## Sift Score v1

Formula version: `sift-evidence-v1.0.0`.

| Component | Weight | Normalization | Freshness |
| --- | ---: | --- | --- |
| Reputation | 25 | A named source's explicitly normalized value from 0–100 | 180 days |
| Observed reliability | 20 | Successful bounded probes / bounded probes × 100; available after 3 checks | 24 hours |
| Current reachability | 20 | Online 100, Degraded 40, Offline 0, Unknown unavailable | 24 hours |
| Declared capability evidence | 15 | 40 for a valid service declaration; +20 for 2 types, +10 for 3 types, +15 for an endpoint, +10 for a version, +5 for structured service metadata; capped at 100 | Valid metadata verified within 30 days |
| Supported track record | 15 | Successful jobs / supported completed jobs × 100 | Named source observed within 180 days |
| Metadata quality | 5 | Name 25, description 30, image 10, owner 10, active declaration 5, x402 declaration 5, successful verification timestamp 15 | Valid metadata verified within 30 days |

Capability and metadata components measure completeness of current declarations. They do not verify performance. Reputation and job evidence are excluded unless `agent_reputation.source` and `source_observed_at` are both present. M6 does not populate those fields because the audited catalogue has no supported reputation source.

Each available component is multiplied by its weight. The published score is:

```text
sum(component value × component weight) / sum(available component weights)
```

Component values and the final result are rounded to two decimal places. Missing components are omitted, never replaced by a neutral or positive value. Confidence is the available supported weight divided by 100 and is rounded to four decimal places.

A score is withheld unless at least 40% of total formula weight is supported and at least one independent signal is available from reputation, observed reliability, current reachability, or supported track record. A single fresh health observation plus complete declarations can therefore produce a low-confidence score; declarations alone cannot.

Every assessment, including a withheld `null` result, is persisted with its component values, confidence, formula version, calculation time, source freshness, and an evidence snapshot. Identical inputs and assessment time produce identical output.

## Recalculation

Run a configuration/formula smoke check:

```bash
npm run score:smoke
```

Recalculate one bounded affected batch:

```bash
npm run score:agents
```

The server-only recalculation queue selects a record when no assessment exists, the formula version changed, an agent/service/health/reputation row changed after calculation, or a previously used source crossed its freshness boundary. Upserts use `agent_db_id` as the conflict key, so replaying the same assessment replaces the same row rather than creating duplicates.

`.github/workflows/assess-agents.yml` runs health assessment followed by scoring every six hours and supports manual dispatch. It requires only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as GitHub secrets. It has read-only repository permission, bounded runtime, and no wallet or signing material.

## UI and Featured rule

Discover cards show a persisted score with confidence or stale status and a persisted health label with freshness. Profiles show calculation time, confidence/evidence coverage, every component, unavailable signals, health outcome/history, and a keyboard-accessible `Why this score?` disclosure. The score is explicitly described as decision support, not proof that an agent is safe, best, or suitable for every task.

Featured Agents uses no payment and no fallback data. An agent qualifies only when all of these are true:

- its score uses the current formula version;
- the score was calculated within 24 hours and is not null;
- confidence is at least 0.60;
- its latest health observation is `Online`, has outcome `success`, and is within 24 hours.

Qualifying agents are ordered by score and then confidence. If none qualify, Featured remains visibly unavailable while all agents remain discoverable.

## Deployment order

Deploy `20260822111500_add_metadata_verification_time.sql` first if it is not already present, then deploy `20260822130000_add_health_scoring_provenance.sql`. After the hosted migration succeeds:

1. run `npm run check:smoke` and `npm run score:smoke`;
2. manually dispatch the assessment workflow or run one small local batch;
3. inspect `agent_health` and `agent_scores` for real persisted rows;
4. verify an assessed profile and discovery card in the browser;
5. confirm unsupported endpoints remain `Unknown` and have no successful probe history.

Do not run assessment commands against a project that has not applied the M6 migration. Never add synthetic rows to make a score or Featured state appear populated.
