# TICKET-004 — M4 Discover Marketplace

## Status

Complete

## Depends On

M3 — BNB / ERC-8004 Indexer

## Objective

Deliver Sift's real-agent discovery marketplace at `/discover`, allowing users to search, filter, sort, and progressively browse the indexed BNB Chain agent catalogue through clear, responsive agent cards.

## Product Context

This milestone turns the indexed catalogue into Sift's first complete product workflow. Users should be able to express a goal in normal language, narrow a large technical ecosystem, and understand enough about each result to decide what to inspect next without reading raw registry records.

## Scope

- Create the `/discover` route using the App Router and Server Components by default.
- Connect landing-page search and category shortcuts to meaningful discovery URL parameters.
- Query only real agents persisted by the Sift Indexer.
- Implement PostgreSQL-backed search across available name, description, category, capabilities, and service fields.
- Implement deterministic keyword intent mapping for the four first-class categories:
  - Yield Optimisation;
  - Grid Trading;
  - Health Factor Monitoring;
  - Liquidity Rebalancing.
- Implement URL-addressable filters for supported fields, including category and metadata/verification status.
- Expose availability, trust, and risk filters only when the indexed data genuinely supports them; otherwise omit or clearly disable them.
- Implement supported sorting, including Recently Registered and other options backed by real fields.
- Implement stable pagination or progressive loading with bounded page sizes.
- Build reusable, accessible agent card components with human-readable fallbacks.
- Show available identity, category, description, services/capabilities, verification provenance, registration recency, and other supported fields.
- Omit unknown metrics or label them `Not available`; never substitute invented values.
- Add loading skeletons, actionable error states, useful empty states, and retry behavior where appropriate.
- Provide responsive desktop, tablet, and mobile filter/search experiences.
- Preserve search/filter/sort/page state in the URL so views can be shared and restored.
- Connect the landing-page `Recently registered` preview only when real indexed registration data exists.
- Keep the landing-page featured collection unavailable unless a documented, deterministic, evidence-based selection rule exists; M6 Sift Score must not be simulated early.

## Out of Scope

- Full agent profile pages or dynamic profile tabs.
- Endpoint health checks, new reputation derivation, risk inference, or Sift Score calculation.
- Comparison selection or comparison pages.
- Wallet connection, hiring, jobs, or dashboard features.
- Semantic/vector search, paid AI classification, Elasticsearch, or external search infrastructure.
- Fake agents, fake counts, fake online status, fake ratings, fake performance, or fake rankings.
- Making 8004scan a required runtime dependency.

## Technical Requirements

- Use the M2 repository/service layer; React components must not scatter raw Supabase queries.
- Keep query parsing and validation in a dedicated discovery/search module.
- Use PostgreSQL text search and deterministic category mappings first.
- Validate and normalize all URL parameters, sort keys, page sizes, and filter values.
- Use stable ordering with a deterministic tiebreaker to avoid pagination duplicates or gaps.
- Prefer Server Components for initial results; use Client Components only for interactions that require browser state.
- Add TanStack Query only if it materially improves progressive loading or cache behavior; do not add it automatically.
- Keep card, filter, search, pagination, and state modules small and composable.
- Avoid N+1 data access when loading services/capabilities.
- Ensure query plans have appropriate M2 indexes and document any required migration additions.
- Preserve the established dark BNB-inspired Sift design system and accessible focus states.

## Data Integrity Requirements

- Display only data read from the Sift database and traceable to indexed sources.
- Never fabricate reputation, task counts, success rates, prices, APY, availability, wallet activity, transactions, or blockchain events.
- Do not interpret missing endpoint/health information as offline or online; use `Unknown` or omit it.
- Do not label an agent verified unless the displayed verification statement is supported by source data.
- Do not calculate or show Sift Score before M6.
- Do not infer risk classifications without documented supporting inputs.
- Demo fixtures may be used only in tests and must be clearly identified as fixtures, never shipped as production marketplace results.

## Security Requirements

- Validate all search and filter input server-side.
- Avoid unsafe SQL string construction; use parameterized Supabase/PostgreSQL query mechanisms.
- Sanitize external image and endpoint URLs before rendering; configure remote images conservatively or use safe fallbacks.
- Do not expose service-role credentials or privileged database errors to the browser.
- Rate-limit or bound expensive search requests where practical without adding paid infrastructure.

## UX Requirements

- A user must be able to understand and use the marketplace on mobile and desktop.
- Search must accept normal-language goals and surface the mapped category clearly.
- Filters must be keyboard accessible, labelled, and easy to clear.
- Active filters, sorting, result count when genuinely known, and pagination state must be understandable.
- Cards must prioritize human-readable purpose over raw blockchain fields.
- Loading should use stable skeleton layouts without large content jumps.
- Empty states must explain why no results matched and offer clear filter-reset or category actions.
- Errors must use plain language and never expose stack traces or raw database responses.
- Unknown data must look intentional rather than broken.

## Acceptance Criteria

- [ ] `/discover` renders real indexed agents from the M3 catalogue.
- [ ] Landing search and all four category shortcuts open valid discovery states.
- [ ] Search and deterministic intent mapping cover all four required categories.
- [ ] Supported filters and sorts update the URL and results consistently.
- [ ] Recently Registered uses real registration data.
- [ ] Pagination/progressive loading is stable and bounded.
- [ ] Agent cards use real values and graceful unknown fallbacks.
- [ ] No Sift Score, health, risk, activity, or reputation value is invented.
- [ ] Loading, error, empty, and no-JavaScript initial states are usable.
- [ ] Desktop, tablet, and mobile layouts are responsive and accessible.
- [ ] Database access remains behind feature repositories/services.
- [ ] Lint, typecheck, relevant tests, browser testing, and production build pass.

## Testing Requirements

- Unit-test query parsing, category intent mapping, filter validation, sort mapping, and fallback formatting.
- Integration-test repository search/filter/sort/pagination behavior against representative labelled fixtures.
- Test stable pagination and combined filters.
- Browser-test search, category entry, applying/clearing filters, sorting, pagination, empty state, and mobile filter controls.
- Include accessibility checks for labels, keyboard navigation, focus visibility, headings, and result announcements where appropriate.
- Run `npm run lint`, typecheck, relevant tests, and `npm run build`.

## Definition of Done

M4 is complete when users can reach `/discover`, search and browse real indexed agents across all four categories, combine supported filters and sorting, navigate stable result pages on mobile or desktop, and encounter honest loading/error/empty states with no fabricated marketplace data or M5 profile implementation.

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
