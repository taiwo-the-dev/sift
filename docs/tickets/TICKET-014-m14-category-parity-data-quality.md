# TICKET-014 — M14 Category Parity & Decision-Grade Data

## Status

Coverage PASS — hosted migration-history confirmation remains an external gate

## Depends On

M13 — Main-Track Eligibility & BSC Mainnet Catalogue

## Objective

Give all four required agent categories equally useful discovery, profile, and
comparison experiences backed by current, source-attributed evidence that helps
a user make an informed hiring decision.

## Product Context

The official rubric penalizes a marketplace that treats one category as the
main event. Sift's M13 catalogue contains hundreds of thousands of mainnet identities,
but pre-M14 category matching uses broad request-time keyword scans and its
evidence coverage has not been measured. Equal depth means equivalent
decision quality and usability—not invented agents or artificially identical
counts.

## Scope

- Define and document an auditable taxonomy for Rebalancing, Grid Trading,
  Yield Optimisation, and Health Factor Monitoring.
- Prefer explicit indexed metadata/service declarations. Keep deterministic
  keyword inference separately labelled with its rule/version and lower
  confidence.
- Measure per-category mainnet inventory, valid metadata, services, health,
  reputation, score, image, endpoint, and activation coverage.
- Curate a source-backed shortlist of at least three strong mainnet candidates
  per category. If the live supply cannot meet that bar, report M14 blocked
  instead of fabricating or misclassifying agents.
- Give each category an equally complete route, description, empty state,
  filters, profile evidence, comparison fields, and activation-availability
  explanation.
- Add category-relevant evidence only when declared by a verified source:
  - Rebalancing: supported protocol/pool, position/range capability, service;
  - Grid Trading: venue, market/pair, supported grid behavior, service;
  - Yield Optimisation: protocols/assets/strategy scope, service;
  - Health Factor Monitoring: lending protocol, monitored position/alert scope,
    service.
- Improve bounded coverage of existing health, reputation, service, and Sift
  Score pipelines for the curated shortlist and display observation time.
- Explain score coverage, version, confidence, missing components, and why an
  unavailable score remains Unknown.
- Add a generated category-coverage report used by release validation.
- Integrate the hackathon's 8004scan Pro API as required server-side
  enrichment/validation behind a small adapter, cache, rate limit, source label,
  and graceful fallback. Sift's own index remains the core catalogue.
- Cross-check a documented sample from every required category against
  8004scan identity, capability, ownership, reputation, feedback, and network
  evidence where the API provides those fields.
- Update scoring, database, comparison, architecture, and demo documentation.

## Out of Scope

- Fabricating descriptions, category membership, APR, win rate, returns, risk,
  reputation, uptime, price, reviews, service availability, or transactions.
- Requiring 8004scan for core discovery or silently overwriting onchain data.
- Building an AI/LLM recommender, paid data integration, or manual unverifiable
  ranking system.
- Mainnet activation, partner-track features, public submission, or Phase 2
  guesses.
- Changing the Sift Score weights without a documented evidence-driven reason
  and version increment.

## Technical Requirements

- Keep taxonomy/category mapping deterministic, versioned, testable, and shared
  by indexing and read models rather than duplicated in components.
- Preserve raw source data separately from normalized display fields.
- Every enrichment field needs source type, source reference where safe,
  observed-at time, and availability state.
- Batch and bound evidence collection; one broken endpoint must not fail a
  category or assessment run.
- Cache 8004scan server-side and stay within the granted free-tier limits. The
  API key must be server-only and documented by name, never value, in
  `.env.example`. The application must still start and core discovery must still
  work when the key or service is unavailable.
- External enrichment outages must degrade to core indexed evidence and Unknown.
- Maintain strict TypeScript and Server Components for read-heavy routes.

## Data Integrity Requirements

- Never turn inferred classification into a declared agent capability.
- Never treat agent registration, an image, or a reachable URL as proof of
  performance or safety.
- Reputation/feedback must retain source identity, sample size, and observation
  time; zero and unavailable must remain different.
- Performance claims such as APR, win rate, or reliability require a defined
  period, method, and source. Otherwise omit them or show Unknown.
- Generated coverage reports must be reproducible from stored source-backed
  records and timestamped.

## Security Requirements

- Treat every metadata/enrichment URL and payload as untrusted.
- Preserve SSRF, redirect, timeout, content-type, size, schema, and sanitization
  controls.
- Never render untrusted HTML or execute agent-provided code.
- Keep enrichment credentials out of client bundles, logs, screenshots, and
  repository history.

## UX Requirements

- All four category entry points have equivalent visual priority and depth.
- Users can distinguish declared, inferred, observed, and unavailable evidence.
- Category-specific evidence uses plain language and concise explanations.
- Missing evidence reduces confidence; it must not create false positive or
  false negative claims.
- Cards, profiles, and comparison stay responsive, accessible, and scannable.
- Filters must not imply that unsupported criteria were evaluated.

## Acceptance Criteria

- [x] The four-category taxonomy and mapping rules are documented and tested.
- [x] A timestamped report measures inventory and evidence coverage per category.
- [x] At least three source-backed mainnet candidates per category meet the
      documented shortlist bar, or the ticket is honestly BLOCKED with evidence.
- [x] Every category has equivalent discovery, profile, comparison, and honest
      activation-availability treatment.
- [x] Category-specific fields display only when supported by source evidence.
- [x] Declared versus inferred categories are distinguishable.
- [x] Curated candidates have current health/score/reputation/service evidence
      where supported, with Unknown used for real gaps.
- [x] Score version, confidence, coverage, and observation time remain visible.
- [x] 8004scan enrichment is implemented, source-labelled, cached, rate-limited,
      and independently removable without breaking core discovery.
- [x] A real sample in every required category has a recorded cross-check result
      or an honest API-field-unavailable result.
- [x] No fabricated marketplace or performance data exists.

## Testing Requirements

- Unit-test taxonomy rules, evidence provenance, confidence/Unknown handling,
  and category-specific field mapping.
- Integration-test coverage aggregation, 8004scan mapping/cache/rate handling,
  and missing-key/outage fallback.
- Browser-test the same find/profile/compare tasks in all four categories on
  desktop and mobile.
- Test stale, absent, invalid, and conflicting source evidence.
- Run `npm run lint`, typecheck, relevant tests, and `npm run build`.
- Record a hosted read-only coverage report before declaring PASS.

## Definition of Done

M14 is complete when all four categories provide equally usable and comparable
decision journeys, the curated mainnet supply meets the documented evidence
bar, 8004scan has been meaningfully integrated without becoming a core
dependency, coverage/freshness is measurable, every claim has provenance, and
missing data remains honest.

## Implementation Note

The repository-side implementation was completed and validated on 2026-09-03.
The active hosted Supabase project is reachable through the application
credentials, but the locally authenticated Supabase CLI account does not have
permission to link or deploy to it. Therefore the additive M14 migration,
historical classification, shortlist persistence, bounded health/score refresh,
stored 8004scan Pro sample, hosted browser matrix, and timestamped hosted report
remain external completion gates. No fabricated substitute was added.

The repository was revalidated on 2026-09-04: strict TypeScript, ESLint, all
201 unit/integration tests, the 8 wallet rendered-state tests, and the Next.js
production build passed. A deployment retry against the project configured in
`.env.local` was rejected by Supabase because the authenticated CLI account
lacks project privileges. The application secret key cannot deploy database
DDL, and no 8004scan credential is configured locally, so those account-owned
steps cannot be bypassed safely in code.

The same validation also reproduced the current hosted discovery timeout and
confirmed that the M14 tables and RPCs are absent. The pending migration now
keeps catalogue filtering to narrow indexed identifiers before loading full
page data, so it replaces the legacy request-time whole-catalogue classification
that times out at the current 331,747-agent mainnet scale.

After the M14 migration reached the hosted database, the remaining discovery
failure was traced to an unrelated exact inventory count in the network-status
panel. Catalogue status now uses an explicitly labelled PostgreSQL estimate
for that informational count, while checkpoint and agent records stay
exact. A follow-up additive index bounds the latest-sync lookup; discovery no
longer blocks on a full-table count.

Hosted browser testing on 2026-09-05 then exposed a narrower timeout when a
high-frequency term such as `trading` was combined with category evidence. The
follow-up search migration preserves the general indexed query and gives this
combined request shape a category-first, bounded plan. This changes no indexed
agent or evidence records and requires no blockchain re-index.

On 2026-09-07 the resumable historical classifier completed after processing
282,581 valid mainnet metadata records and persisted 63 source-backed matches.
Curation then validated and stored the documented 12-agent shortlist, and the
anonymous 8004scan boundary recorded 12 available cross-check responses. The
timestamped category report passed for all four categories with at least three
inventory, shortlist, and cross-check rows each.

A bounded health refresh completed without fabricating unavailable endpoint
evidence. The following score refresh exposed a separate scale bottleneck in
the catalogue-wide score candidate query and did not complete. The repository
now includes an additive migration correcting the legacy shortlist replacement
function's safe-update violation; it still needs to be deployed for future
atomic shortlist reruns. At that time M14 remained blocked on that deployment,
the score-query fix, and hosted browser validation.

On 2026-09-10 the current hosted system accepted an atomic shortlist refresh,
the former score-candidate query completed without timing out, and the desktop
and mobile mainnet browser path passed locally and against the public baseline.
The refreshed `sift-category-taxonomy-v1.1.0` report passes with 12 curated
agents and 12 current 8004scan cross-checks. Health, score, service, and image
evidence is present where supported; reputation remains Unknown because no
verified reputation source has been persisted. The only remaining M14 release
gate is an authenticated operator's confirmation that every migration appears
in hosted Supabase history.

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
