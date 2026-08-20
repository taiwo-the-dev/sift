# TICKET-006 — M6 Agent Health + Sift Score

## Status

Ready

## Depends On

M5 — Agent Profiles

## Objective

Add bounded agent endpoint health assessment and a deterministic, versioned Sift Score that combines only supported evidence, reports confidence, persists its breakdown, and explains rankings to users.

## Product Context

Sift should help users distinguish agents without reducing trust to an unexplained badge. Health and scoring must therefore be evidence-based, reproducible, and transparent about missing information. This milestone adds decision support while preserving uncertainty rather than rewarding agents for unavailable data.

## Scope

- Audit the actual fields available from indexed agents, services, reputation sources, and supported activity before finalizing scoring weights.
- Implement safe endpoint health checks only for service types and URLs that can be checked meaningfully.
- Persist health status, response time where valid, last checked, last success, and bounded failure count in `agent_health`.
- Prioritize relevant, top, and recently registered agents; do not scan every endpoint aggressively.
- Add a documented scheduler/CLI path for health checks that can operate within free-tier limits.
- Implement a pure deterministic scoring engine using available supported signals such as:
  - reputation;
  - reliability;
  - availability;
  - capability match;
  - relevant track record;
  - metadata completeness.
- Define a versioned formula after the data audit; document every input, normalization rule, weight, cap, and missing-data behavior.
- Calculate and persist score, confidence, version, timestamp, component breakdown, and source freshness in `agent_scores`.
- Reduce confidence or withhold a score when evidence is insufficient.
- Recalculate affected scores when relevant inputs change and make recalculation idempotent.
- Add CLI commands such as `npm run check:agents` and `npm run score:agents`, or equivalent documented commands.
- Add Sift Score presentation to supported discover cards and profile pages.
- Add an accessible explanation component answering why an agent received its score and how confident Sift is.
- Update Featured Agents only from a documented real-data rule based on the completed score/evidence model.
- Show health and score freshness clearly.

## Out of Scope

- LLM-generated scores, subjective AI rankings, or opaque recommendations.
- Aggressive continuous endpoint polling.
- Executing agent actions to test them.
- Financial risk advice or unsupported risk classifications.
- User comparison selection and `/compare` functionality.
- Wallet connection, hiring, transactions, jobs, or dashboard features.
- Paid monitoring, observability, AI, or RPC services.
- Treating metadata claims as verified reliability or performance.

## Technical Requirements

- Keep health checking and scoring in separate domain modules outside React components.
- Make the scoring function pure where practical and accept explicit typed inputs.
- Version every scoring formula and persist `score_version` with each result.
- Store component values and confidence so the final score can be audited and reproduced.
- Define deterministic normalization, rounding, caps, and missing-signal rules.
- Use bounded concurrency, timeouts, retries, and check intervals for health probes.
- Implement endpoint eligibility rules by service type; unsupported endpoints must remain `Unknown`.
- Separate transport failure, invalid endpoint, unsupported check, and successful response states.
- Use server-side scheduled scripts or GitHub Actions-compatible commands rather than browser polling.
- Read and write through the existing repositories/services.
- Expose score explanation through reusable typed view models.
- Preserve score stability for identical inputs and log formula version changes.

## Data Integrity Requirements

- Every health field and score component must come from real data or a documented deterministic rule.
- Never ask an LLM to assign scores or fill missing components.
- Never convert missing data into a neutral or positive signal without explicit documented reasoning.
- Reduce confidence or return an unavailable score when evidence is insufficient.
- Distinguish declared capability, endpoint reachability, historical reliability, reputation, and task success; do not treat them as interchangeable.
- Do not claim an agent is safe, low risk, or best in absolute terms based only on Sift Score.
- Persist timestamps and source freshness for auditability.
- Do not overwrite last successful health evidence with fabricated values after a failed check.

## Security Requirements

- Protect health checks against SSRF: block localhost, link-local, private network ranges, unsafe schemes, and redirect escapes.
- Apply strict timeouts, response-size limits, and bounded concurrency.
- Never send secrets, wallet credentials, or user data to agent endpoints during health checks.
- Do not execute transactions, arbitrary code, tools, or agent actions.
- Sanitize endpoint URLs and errors before logging or displaying them.
- Keep scheduled job credentials server-only.

## UX Requirements

- Display Sift Score with confidence and last calculated time, not as an unexplained absolute truth.
- Provide a clear `Why this score?` explanation with component contributions and limitations.
- Use `Unknown` or `Not enough evidence` when health or score cannot be determined.
- Differentiate current reachability from long-term reliability.
- Do not use alarming red/green semantics without text labels.
- Ensure explanation content is readable on mobile and accessible by keyboard/screen reader.
- Featured placement must be explainable and must not imply paid sponsorship.

## Acceptance Criteria

- [ ] Supported health checks are bounded, safe, scheduled/CLI-runnable, and persisted.
- [ ] Unsupported or unsafe endpoints remain Unknown and are not probed.
- [ ] The Sift Score formula, inputs, normalization, weights, and version are documented.
- [ ] Identical inputs always produce the same score, confidence, and breakdown.
- [ ] Missing evidence reduces confidence or withholds the score.
- [ ] Scores and component breakdowns are persisted with timestamps and version.
- [ ] Recalculation is idempotent and responds to changed source inputs.
- [ ] Discover/profile UI displays only real current health and persisted scores.
- [ ] Users can inspect why a score was produced and see its limitations.
- [ ] Featured agents use a documented evidence-based rule or remain unavailable.
- [ ] No endpoint action, wallet, comparison, or hiring work is implemented.
- [ ] Lint, typecheck, unit/integration tests, browser testing, and production build pass.

## Testing Requirements

- Unit-test every score component, normalization boundary, missing-data case, confidence rule, rounding rule, and formula version.
- Add fixed table-driven score fixtures with explicit provenance as test data only.
- Unit-test endpoint eligibility, SSRF blocking, timeouts, failures, successes, and status transitions.
- Integration-test health/score persistence and idempotent recalculation.
- Browser-test score explanations, unknown/low-confidence states, stale states, and mobile accessibility.
- Run `npm run lint`, typecheck, relevant tests, health/score CLI smoke tests, and `npm run build`.

## Definition of Done

M6 is complete when supported agents can be health-checked safely and selectively, Sift Scores are deterministic/versioned/persisted from real evidence, confidence and breakdowns are explainable in the UI, missing data remains honest, and no M7 comparison workflow has begun.

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
