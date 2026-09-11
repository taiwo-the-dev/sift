# TICKET-016 — M16 Judge-Path Validation

## Status

In Progress — automated mainnet browser path passes; human sessions pending

## Depends On

M15 — Frictionless Agent Activation Proof

## Objective

Validate the complete judging journey with representative novice users and
production-shaped browser tests, then correct every reproducible core-path dead
end before the final public release.

## Product Context

The main-track functionality test is deliberately human: someone with zero
Agent Studio knowledge must land, find, understand, and activate with minimal
friction. Engineering tests catch regressions, but only task-based usability
sessions reveal confusing labels, missing explanations, and paths that appear
obvious only to the builders.

## Scope

- Write a concise judge-path test protocol that does not coach participants
  through the interface.
- Test the core journey with at least three people unfamiliar with Agent Studio,
  using anonymized notes and explicit consent for any recording.
- Include one find/understand task for each required category and at least one
  full supported activation/dashboard task.
- Measure completion, time on task, wrong turns, assistance needed, dead ends,
  and participant confidence without inventing findings.
- Triage findings by judging impact and correct all reproducible P0/P1 issues in
  the primary journey.
- Re-test corrected tasks with a clean browser state.
- Automate stable browser coverage for landing, category navigation, search,
  profile, comparison, wallet-disconnected states, and supported activation
  boundaries.
- Validate current desktop and common mobile viewports, keyboard navigation,
  focus order/visibility, labels, dialogs, errors, and reduced motion.
- Check loading, empty, stale, Unknown, external-source failure, wrong-network,
  rejection, pending, and recovery states with honest data.
- Profile the public-candidate build for obvious performance bottlenecks and
  eliminate avoidable blocking regressions in the judge path.
- Produce a judge-path validation report mapping official criteria to evidence,
  remaining limitations, and retest results.

## Out of Scope

- Recruiting a statistically representative research panel.
- Fabricating testimonials, user counts, completion metrics, or feedback.
- Adding unrelated features because a participant suggested them.
- Large visual redesigns without a demonstrated core-path problem.
- Public deployment/submission packaging, partner tracks, or Phase 2 guesses.

## Technical Requirements

- Use the existing browser-test approach and add dependencies only when the
  repository lacks a suitable tool and the benefit is explicit.
- Test production builds where behavior differs from development mode.
- Keep test selectors accessible and semantic; do not distort product markup
  solely for brittle automation.
- Do not automate wallet seed entry. Use an approved disposable mainnet account
  with minimum funds and manual human approval for real transaction evidence.
- Store anonymized test notes and evidence in documentation without personal
  data or secrets.
- Record the exact commit, environment, viewport/browser, network, and data
  freshness used for the final pass.

## Data Integrity Requirements

- Usability metrics and quotes must come from actual observed sessions.
- Browser tests must use real read models or clearly isolated fixtures; fixtures
  must never appear as live marketplace evidence.
- Category and activation claims in the report must link to current source-backed
  catalogue/transaction evidence.
- Failed tasks and unresolved limitations must remain visible in the report.

## Security Requirements

- Do not record seed phrases, private keys, wallet recovery UI, secrets, or
  sensitive participant information.
- Use a disposable mainnet wallet with only the minimum real funds the owner
  explicitly accepts risking.
- Recheck two-wallet isolation, session expiry, logout/disconnect, network
  changes, and transaction confirmation boundaries during testing.
- Sanitize screenshots, recordings, console output, and shared logs.

## UX Requirements

- Sift's purpose is clear within five seconds.
- Category selection uses the hackathon's user terminology.
- A novice can understand agent capability, evidence limits, cost, network, and
  next action without protocol knowledge.
- All four categories receive equivalent testing depth.
- No keyboard trap, invisible focus, clipped primary action, misleading control,
  or unexplained Unknown state remains in the judge path.
- Mobile is a complete usable journey, not merely a non-overflowing layout.

## Acceptance Criteria

- [ ] A non-coaching judge-path protocol covers all four categories and activation.
- [ ] At least three real novice sessions are documented with anonymized results.
- [ ] Every participant attempts land → find → understand; at least one attempts
      the complete supported activation/dashboard journey.
- [ ] Completion, assistance, wrong turns, time, and confidence are reported
      honestly.
- [ ] Every reproducible P0/P1 core-path issue is fixed and retested.
- [ ] Stable browser tests cover the primary no-wallet and activation-boundary paths.
- [ ] Desktop, mobile, keyboard, focus, reduced-motion, and failure-state checks pass.
- [ ] The final report maps functionality, data quality, and diversity criteria
      to evidence and known gaps.
- [ ] No fabricated feedback, metric, testimonial, or live data is used.

## Implementation Note — 2026-09-10

`tests/e2e/judge-path.spec.ts` and `playwright.config.ts` now cover the stable
mainnet no-wallet path on desktop Chromium and a Pixel 7 viewport. All 12 tests
passed against a local production build and the public baseline at
<https://sift-ten-swart.vercel.app>. The non-coaching protocol and empty real
session record are in `docs/judge-path-validation.md`.

M16 remains in progress. No novice session, mainnet wallet confirmation,
two-wallet dashboard result, or final-candidate public retest has been claimed.

## Testing Requirements

- Run focused unit/integration tests for any corrected behavior.
- Run the browser suite against a production build and the release-candidate
  origin when available.
- Manually run screen-reader/keyboard spot checks on the primary flow.
- Run practical performance/accessibility audits and record actionable results,
  without chasing arbitrary perfect scores.
- Run `npm run lint`, typecheck, all relevant tests, and `npm run build`.

## Definition of Done

M16 is complete when representative novices can use the full judging journey,
all four categories have been tested equally, every blocking usability defect
has passed retest, and the evidence report is tied to the exact candidate build.

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
