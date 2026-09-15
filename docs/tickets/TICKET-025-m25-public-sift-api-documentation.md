# M25 — Public Sift API and Documentation

## Status

Implemented Locally; Deployment Validation Pending

## Depends On

M24 — Complete Agent Execution

## Objective

Expose Sift's source-backed BNB Chain agent catalogue through a stable,
versioned, read-only API and provide clear developer documentation for using the
API and interpreting Sift evidence.

## Product Context

Sift is more useful when wallets, marketplaces, dashboards, and other agent
applications can reuse its discovery and trust information. A public API turns
Sift from a single website into composable BNB Chain agent infrastructure while
keeping wallet actions and private hiring records protected.

## Scope

- Add versioned `GET /api/v1` endpoints for agent search, individual profiles,
  Sift Scores, public task evidence, categories, and catalogue status.
- Reuse the existing discovery, profile, scoring, category, and status logic.
- Support documented search filters, sorting, pagination, and BSC network
  selection.
- Return consistent success and error envelopes.
- Add read-only CORS, response caching, and bounded request-rate protection.
- Add a responsive `/docs` page with quick-start examples, endpoint reference,
  query parameters, response formats, Sift Score criteria, freshness rules, and
  data-safety boundaries.
- Link the documentation from desktop navigation, mobile navigation, and footer.
- Include the documentation and API in release smoke validation.

## Out of Scope

- Public write, wallet, hiring, payment, or agent-execution endpoints.
- API keys, paid access plans, developer accounts, usage billing, or a paid
  gateway.
- Exposing private missions, deliverables, wallet sessions, budgets, database
  IDs, credentials, or unverified job details.
- GraphQL, webhooks, SDK generation, or a new search database.
- Changing the Sift Score formula or fabricating missing evidence.

## Technical Requirements

- Use Next.js Route Handlers and standard Web `Request` and `Response` APIs.
- Keep strict TypeScript and the existing server-only Supabase boundary.
- Keep the API under `/api/v1` so future incompatible changes can use a new
  version.
- Reuse indexed discovery queries rather than duplicating search logic.
- Use structured `data`/`meta` success envelopes and `error`/`meta` error
  envelopes.
- Use only existing open-source dependencies and free infrastructure.

## Data Integrity Requirements

- Return only real indexed agents and stored or deterministically calculated
  evidence.
- Missing health, reputation, task, or score evidence must remain null or earn
  zero according to the published score formula.
- Public task records must be limited to confirmed ERC-8183 hires recorded by
  Sift; reported totals must retain their named reputation source.
- Never describe a confirmed hire as proof that the underlying task completed.

## Security Requirements

- Keep `SUPABASE_SECRET_KEY` and every other server credential out of responses.
- Exclude internal agent database IDs, wallet sessions, resume tokens, private
  task text, budgets, and permission details.
- Rate-limit public endpoints and return `429` without leaking internal state.
- Permit cross-origin `GET` and `OPTIONS` only; do not add cross-origin writes.
- Validate all query parameters, chain IDs, and agent IDs before database work.
- Return generic `503` errors at infrastructure boundaries and log only safe
  identifiers and error names.

## UX Requirements

- Documentation must be usable on desktop and mobile.
- Examples must work by replacing only documented path parameters.
- Explain score criteria and freshness in plain language.
- Clearly label the API as read-only and distinguish reported task totals from
  individual Sift task records.

## Acceptance Criteria

- [x] Agents can be searched and paginated through `/api/v1/agents`.
- [x] One indexed agent can be read by chain ID and ERC-8004 agent ID.
- [x] Sift Score criteria and evidence coverage are available through a dedicated
  endpoint.
- [x] Public task evidence omits private hiring data.
- [x] Categories and catalogue status have dedicated endpoints.
- [x] Invalid inputs return a documented `400` response.
- [x] Missing agents return `404`; temporary data failures return `503`.
- [x] Successful and failed responses include API version metadata.
- [x] Public routes support read-only CORS and bounded rate limiting.
- [x] `/docs` documents the full v1 surface and Sift Score.
- [x] No database migration or fabricated data is introduced.
- [ ] The deployed documentation and every endpoint pass release smoke testing.

## Testing Requirements

- Unit-test query validation, response envelopes, CORS, public-data mapping, and
  the six-criterion score response.
- Integration-test profile task-history mapping and exclusion of private fields.
- Run lint, strict TypeScript checking, the relevant test suites, and a
  production build.
- Run the release smoke verifier against the deployed origin after release.

## Definition of Done

M25 is complete when all local checks pass, the deployed `/docs` page is
accessible, each public endpoint returns source-backed data with the documented
contract, privacy boundaries are verified, and the updated release smoke test
passes against production.

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
