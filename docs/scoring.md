# Agent health and Sift Score

M6 adds two separate evidence systems: bounded endpoint observations and a pure, versioned score calculation. Neither system executes an agent action, sends user data, or invents a missing signal.

## Evidence audit

The formula was finalized after a read-only audit of the hosted BSC Testnet catalogue on 2026-08-22. The snapshot contained 1,890 agents and 1,100 declared services, with no existing health, reputation, or score rows. Of those agents, 947 had currently valid metadata, 916 had a description, 217 had an image, and 725 declared at least one service. No canonical Sift category or supported job-history source was populated.

The service declarations included 478 `A2A` and 46 `MCP` records, plus generic web and protocol-specific declarations. Only these targets are considered meaningful health checks in M6:

- an explicit `health` service with a safe public HTTPS endpoint;
- an `A2A` service with a safe public HTTPS endpoint. The checker probes the
  standard A2A discovery document at `<origin>/.well-known/agent-card.json`,
  deriving it from the declared base URL when the declaration does not already
  point straight at that document (`20260908093000_broaden_health_probe_targets.sql`).
  The earlier rule required the declared path itself to end in
  `/.well-known/agent-card.json`, which almost no real agent satisfied, so
  nearly every agent stayed `Unknown` and was never probed.

Generic web, MCP, blockchain, DID, IPFS, ERC-8183, and other declarations are not probed. Reachability of those values would not reliably describe agent health, and some require protocol actions that M6 must not execute.

The bounded probe contract is unchanged: `GET` only, HTTPS on port 443, no body,
no query string, no embedded credentials, at most two validated redirects, a
capped response size, and an A2A response must still be a JSON object.

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

Defaults are deliberately free-tier conscious: the local command checks 20 due
agents while the six-hourly workflow checks at most 50, both with concurrency
3, a 5-second timeout, one retry, a 64 KiB response limit, and a six-hour
minimum interval. Environment overrides are documented in `.env.example` and
have hard maximums.

The server-only queue starts from an indexed subset of valid agents declaring a
potentially supported, query-free HTTPS service. Agents with one or two recent,
conclusive observations are prioritised when their next check is due so they
can earn the reliability criterion after three checks. The queue then considers the
curated category shortlist and never-checked or least-recently-checked agents
to preserve broad coverage. The checker independently validates each
declaration; unsupported, invalid, or unsafe targets remain `Unknown` and
receive no request.

An eligible probe:

- uses `GET` only and never sends secrets, wallet data, user data, or a request body;
- permits HTTPS on the standard port only, without embedded credentials or query parameters;
- blocks localhost, private, link-local, reserved, placeholder, and unsafe DNS destinations;
- validates every redirect and allows no more than two;
- bounds concurrency, retries, duration, and response bytes;
- requires a 2xx response; A2A discovery additionally requires a JSON object response.

`Online` means the latest bounded check succeeded. `Degraded` represents a retryable HTTP response. `Offline` represents a timeout or network failure. `Unknown` covers unsupported, unsafe, invalid, or semantically unusable responses. These labels describe one endpoint observation, not agent safety or guaranteed availability.

The `agent_health` row preserves last success, latest outcome, response time when measured, a bounded consecutive failure count, and bounded successes/checks for the current endpoint fingerprint. A changed endpoint resets endpoint-specific counts. Historical counts compact at 1,000 observations rather than growing without limit.

## Sift Score v2.2

Formula version: `sift-evidence-v2.2.0`.

| Component | Maximum points | Normalization | Freshness |
| --- | ---: | --- | --- |
| Reputation | 15 | A named source's explicitly normalized value from 0–100 | 180 days |
| Observed reliability | 25 | Successful bounded probes / bounded probes × 100; available after 3 checks | 24 hours |
| Current reachability | 20 | Online 100, Degraded 40, Offline 0, Unknown unavailable | 24 hours |
| Declared service information | 10 | 40 for a valid service declaration; +20 for 2 types, +10 for 3 types, +15 for an endpoint, +10 for a version, +5 for structured service metadata; capped at 100 | Valid metadata verified within 30 days |
| Supported track record | 20 | Successful jobs / supported completed jobs × 100 | Named source observed within 180 days |
| Profile integrity | 10 | Name 25, description 30, image 10, owner 10, active declaration 5, x402 declaration 5, successful verification timestamp 15 | Valid metadata verified within 30 days |

Capability and metadata components measure completeness of current declarations. They do not verify performance. Reputation and job evidence are excluded unless `agent_reputation.source` and `source_observed_at` are both present. M6 does not populate those fields because the audited catalogue has no supported reputation source.

Each available component earns points up to its stated maximum. The published
score is the direct sum of those six earned values:

```text
sum(round(component result × maximum points / 100, 2))
```

Component points and the final result are rounded to two decimal places. Missing
or expired evidence earns no points; it is labelled unavailable rather than as
a failed result. The score is never rescaled to hide that missing evidence.
Evidence coverage is the available supported point-weight divided by 100 and is
rounded to four decimal places.

The direct sum is always shown, including when the total is zero. This is not a
fabricated rating: only real, current evidence earns points. A criterion without
qualifying evidence contributes zero and the separate evidence-coverage value
makes that absence explicit. Reliability still requires at least three current
checks; one observation can contribute availability points but not reliability
points.

Every stored assessment preserves its component values, confidence, formula
version, calculation time, source freshness, and an evidence snapshot. Identical
inputs and assessment time produce identical output.

### Rating levels in the product

Every indexed agent receives one honest score state:

- **Sift Score** — the direct sum of the points earned across the six criteria.
  The tooltip shows exactly which criteria had qualifying evidence.
- **Score needs updating** — a stored v2 score exists, but its assessment is older
  than 24 hours. The last known value may be shown with that warning, but it is
  excluded from current Featured placement.

Only a current persisted Sift Score may influence score-based filtering,
Featured placement, or a supported comparison tie. Retired formula assessments
stay in the canonical score table until they are recalculated from current
evidence, but they do not appear as current scores in discovery.

## Recalculation

Run a configuration/formula smoke check:

```bash
npm run score:smoke
```

Recalculate one bounded affected batch:

```bash
npm run score:agents
```

The server-only recalculation queue selects a record when it has current
independent health or reputation evidence and no assessment, the formula
version changed, an agent/service/health/reputation row changed after
calculation, or a previously used source crossed its freshness boundary.
Metadata-only catalogue rows do not occupy every batch because the UI can
calculate their declaration points directly from the evidence already loaded.
Upserts use `agent_db_id` as the
conflict key, so replaying the same assessment replaces the same row rather
than creating duplicates.

`20260908090000_scale_score_recalculation_queue.sql` rewrites
`score_recalculation_candidates` as independently bounded, index-friendly
branches — old formula versions, unassessed agents with current independent
evidence, and records whose real source rows changed after the last
calculation. The earlier plan
combined a five-way outer join with a per-row correlated aggregate over
`agent_services` and a computed multi-timestamp sort key, so Postgres had to
sort the whole catalogue before `limit` applied and the hosted run timed out.
The contract, weights, and formula version are unchanged.

`20260914103000_prioritize_sift_score_v2_evidence.sql` further prevents the
retired v1 backlog from occupying the bounded score queue. A retired assessment
is recalculated only after the agent has current independent health,
reputation, or task-history evidence. The same migration prioritises due second
and third conclusive health observations without increasing the batch size or
weakening the network-safety rules.

`20260914120000_sum_sift_score_component_points.sql` advances the current
formula to v2.1 and keeps v2.0 values out of discovery until their real evidence
is recalculated. It does not delete canonical evidence or manufacture a score.

`20260914130000_show_direct_sift_score_for_all_evidence.sql` advances the
stored formula marker to v2.2 after removing the display publication gate.
Missing evidence still earns zero, and the bounded queue remains responsible
for persisting refreshed assessments.

To drain all currently actionable score work after the migration is deployed,
run the bounded, idempotent backfill:

```bash
npm run backfill:scores
```

It repeatedly drains the same evidence-first queue used by the scheduled job,
stopping when no candidate remains. It does not create hundreds of thousands
of meaningless metadata-only score rows. A 100-batch safety cap prevents an
accidental unbounded run; if reached, rerunning continues safely because score
upserts are idempotent.

`.github/workflows/assess-agents.yml` runs health assessment followed by scoring every six hours and supports manual dispatch. It requires only `SUPABASE_URL` and `SUPABASE_SECRET_KEY` as GitHub secrets. It has read-only repository permission, bounded runtime, and no wallet or signing material.

## UI and Featured rule

Discover cards always show the direct numeric total, using current page evidence
when no v2 stored assessment exists, or a stale last-known state alongside
health freshness. Profiles keep profile completeness separate from Sift Score,
and show calculation time,
confidence/evidence coverage, every component, unavailable signals, health
outcome/history, and a keyboard-accessible `Why this score?` disclosure. The
score is decision support, not proof that an agent is safe, best, or suitable
for every task.

Featured Agents uses no payment and no fallback data. An agent qualifies only when all of these are true:

- its score uses the current formula version;
- the score was calculated within 24 hours and is not null;
- confidence is at least 0.60;
- its latest health observation is `Online`, has outcome `success`, and is within 24 hours.

Qualifying agents are ordered by score and then confidence. If none qualify, Featured remains visibly unavailable while all agents remain discoverable.

## Deployment order

Deploy `20260822111500_add_metadata_verification_time.sql` first if it is not
already present, then `20260822130000_add_health_scoring_provenance.sql`,
`20260914100000_add_sift_score_v2.sql`, and
`20260914103000_prioritize_sift_score_v2_evidence.sql`,
`20260914120000_sum_sift_score_component_points.sql`, and
`20260914130000_show_direct_sift_score_for_all_evidence.sql`. After the hosted migrations
succeed:

1. run `npm run check:smoke` and `npm run score:smoke`;
2. manually dispatch the assessment workflow or run one small local batch;
3. inspect `agent_health` and `agent_scores` for real persisted rows;
4. verify an assessed profile and discovery card in the browser;
5. confirm unsupported endpoints remain `Unknown` and have no successful probe history.

Do not run assessment commands against a project that has not applied the M6 migration. Never add synthetic rows to make a score or Featured state appear populated.

## M14 shortlist coverage

Category membership and its `0.65`/`1.0` classification confidence are not
inputs to Sift Score v2. They describe how validated metadata was mapped, not
whether an agent performs well. M14 does not change score weights or the
formula version.

The bounded health queue prioritizes validated M14 shortlist members only when
they also satisfy the unchanged safe endpoint criteria. It then fairly checks
the wider eligible A2A/health-service queue. A later score run
recalculates records whose real source inputs changed. Missing health,
reputation, or job evidence earns zero points and lowers evidence coverage.
The UI continues to show formula version, confidence, missing components,
source freshness, and calculation time.
