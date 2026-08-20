# TICKET-007 — M7 Agent Comparison

## Status

Ready

## Depends On

M6 — Agent Health + Sift Score

## Objective

Enable users to select two to four real agents and compare their purpose, evidence, capabilities, health, Sift Score, and other supported attributes side-by-side at `/compare`.

## Product Context

Discovery and profiles provide individual context, but users often need to evaluate tradeoffs between plausible options. Comparison should make differences legible and explain which agent best matches the user's stated requirements without declaring a universal winner.

## Scope

- Add reusable add/remove comparison controls to discovery cards and agent profiles.
- Enforce a minimum of two and maximum of four selected agents for the comparison view.
- Create `/compare` with a responsive comparison experience.
- Persist selection in validated URL parameters or a small documented local client state; prefer shareable URLs where practical.
- Preserve the user's current goal/intent context when comparison begins from discovery.
- Compare only supported real fields, such as:
  - Sift Score and confidence;
  - reputation where available;
  - health/availability evidence;
  - category;
  - capabilities and services;
  - successful activity where verified;
  - supported protocols;
  - known cost fields;
  - last verified;
  - supported risk information.
- Show clear Unknown/Not available cells and source freshness.
- Implement contextual strongest-match logic using documented deterministic comparison rules and the current goal.
- Explain why an agent is highlighted and avoid absolute `best agent` language.
- Allow users to remove, replace, or clear agents without leaving broken states.
- Handle invalid, duplicate, missing, and no-longer-indexed agent IDs safely.
- Support mobile comparison through stacked groups, horizontal scrolling with sticky labels, or another tested accessible pattern.
- Add helpful empty and under-minimum states that direct users back to discovery.

## Out of Scope

- Wallet connection.
- Hiring or `Try Agent` transactions.
- Mission configuration, permissions, jobs, or dashboard state.
- Saving comparisons to authenticated user accounts.
- AI/LLM-generated comparison summaries.
- Invented costs, performance, reputation, risk, or activity.
- Changing the M6 scoring formula solely to force a comparison winner.

## Technical Requirements

- Use canonical agent references containing chain ID and agent ID; avoid ambiguous IDs.
- Validate, deduplicate, and cap selection state before database queries.
- Fetch all selected agents and related evidence in one bounded repository/service operation.
- Keep comparison derivation in pure typed domain utilities outside components.
- Make contextual highlight rules deterministic, documented, and independently testable.
- Preserve selection and goal context in a shareable URL when URL size remains reasonable.
- Use client state only for immediate interaction; server-render the canonical comparison where practical.
- Keep table/row, selector, empty state, mobile, and highlight explanation components composable.
- Prevent wide layouts from causing page-level horizontal overflow.
- Maintain the existing Sift design system and accessibility patterns.

## Data Integrity Requirements

- Compare only real persisted values and documented M6 derived scores.
- Never fabricate missing values to make rows complete.
- Show Sift Score confidence and freshness alongside the score.
- Do not treat Unknown as zero or as worse than a verified negative value without explicit explanation.
- Do not label any agent universally best; use contextual language tied to stated requirements.
- If evidence is insufficient to highlight a match, say so rather than choosing one.
- Test fixtures must never ship as production comparison data.

## Security Requirements

- Treat comparison URL parameters as untrusted input.
- Validate chain IDs and agent IDs and limit query size to four agents.
- Do not expose internal database IDs or privileged query errors.
- Sanitize any external links rendered in comparison cells.
- Avoid storing sensitive wallet or user information; none is needed in this milestone.

## UX Requirements

- Show selection count and the two-to-four limit wherever users add agents.
- Provide immediate, accessible feedback for add, duplicate, limit, remove, and clear actions.
- Keep row labels visible and values associated correctly on desktop and mobile.
- Highlight differences without relying only on color.
- Explain contextual strongest-match decisions in plain language.
- Preserve keyboard navigation and visible focus across selection and comparison controls.
- Provide useful states for zero, one, missing, and stale agents.

## Acceptance Criteria

- [ ] Users can add and remove agents from discovery and profile pages.
- [ ] Selection is deduplicated and limited to two to four agents.
- [ ] `/compare` restores a valid shareable selection and optional goal context.
- [ ] Real supported attributes render side-by-side with honest unknown states.
- [ ] Sift Score includes confidence, breakdown access, and freshness.
- [ ] Contextual strongest match is deterministic, explained, and omitted when evidence is insufficient.
- [ ] Invalid/missing agent references degrade gracefully.
- [ ] Mobile comparison is usable with no page-level horizontal overflow.
- [ ] No wallet, hiring, authentication, or account persistence is introduced.
- [ ] Lint, typecheck, relevant tests, browser testing, and production build pass.

## Testing Requirements

- Unit-test selection parsing, deduplication, size limits, serialization, contextual comparison, Unknown handling, and highlight tie/insufficient-evidence cases.
- Integration-test loading two to four agents with mixed evidence completeness.
- Browser-test add/remove/replace/clear, maximum limit feedback, shared URLs, goal preservation, missing agents, keyboard operation, and mobile layout.
- Add accessibility checks for headers, cell associations, focus order, announcements, and non-color highlights.
- Run `npm run lint`, typecheck, relevant tests, and `npm run build`.

## Definition of Done

M7 is complete when a user can select two to four real agents, share and restore a comparison, understand supported differences and uncertainty on desktop or mobile, see an explainable contextual match only when justified, and no M8 wallet functionality has begun.

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
