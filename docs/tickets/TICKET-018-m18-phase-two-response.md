# TICKET-018 — M18 Official Phase 2 Response

## Status

Blocked — Official Criteria Not Published

## Depends On

M17 — Public Launch & Submission Package, and publication of the official Smart
Money Era Phase 2 requirements by BNB Chain

## Objective

Respond quickly and traceably to the official Phase 2 criteria after they are
published, without spending time or introducing risk based on speculation.

## Product Context

The event page states that the top three projects enter a redacted second phase
and that more criteria will be assessed. Sift cannot responsibly design or
implement unknown requirements. This ticket preserves a controlled place to
capture the organizer's exact request if Sift is shortlisted.

## Scope

While blocked:

- Monitor the official event page and official support/announcement channels.
- Preserve the stable M17 release and evidence package.
- Do not implement guessed Phase 2 features.

After official publication and explicit user approval:

- Save the official announcement URL, publication time, deadline, eligibility,
  deliverables, scoring, submission channel, and any organizer clarifications.
- Amend this ticket with exact Scope, Out of Scope, technical/security/UX
  requirements, acceptance criteria, and testing derived from that source.
- Map each criterion to existing Sift evidence and identify only genuine gaps.
- Produce a risk-ranked, time-bounded implementation plan that preserves the
  already validated main-track journey.
- Implement only the approved amended scope and update the public evidence.
- Re-run all affected M17 release checks and record the new release commit.

## Out of Scope

- Any application code while the Phase 2 criteria remain unpublished.
- Speculative agent creation, partner integrations, token economics, mainnet
  transactions, custody, or paid services.
- Treating rumors, unofficial social posts, or another hackathon's rules as the
  controlling specification.
- Automatically beginning work merely because criteria appear online; explicit
  user approval is still required.

## Technical Requirements

- Use the official BNB Chain event page or directly linked organizer source as
  the authority.
- Preserve a dated source citation and a concise diff from the M17 candidate.
- Re-read relevant installed framework documentation before code changes.
- Keep strict TypeScript, existing security boundaries, source-backed data, and
  approximately $0 infrastructure unless the amended official requirement and
  user approval justify a change.

## Data Integrity Requirements

- Never fabricate Phase 2 criteria, test results, transactions, agent output,
  users, partnerships, or judge feedback.
- Any new metric or evidence must include its source, method, scope, and time.
- Preserve Unknown/unavailable states and existing provenance rules.

## Security Requirements

- Perform a fresh threat review for any newly required wallet, contract, agent,
  data, or third-party integration.
- No private key, seed phrase, custody, mainnet write, broad approval, or paid
  dependency is authorized by this placeholder ticket.
- Re-run secret, authorization, RLS, wallet-chain, and dependency checks for the
  amended release.

## UX Requirements

- New Phase 2 behavior must not make the validated land/find/understand/activate
  path harder or less honest.
- Any new judge flow must be documented and tested from a clean browser.
- Time pressure is not permission to ship misleading or inaccessible UI.

## Acceptance Criteria

While blocked:

- [ ] No Phase 2 application work has started.
- [ ] The official announcement channels are identified for monitoring.

After publication:

- [ ] The official criteria and deadline are cited and archived in this ticket.
- [ ] This ticket is amended into a complete, checkable implementation spec.
- [ ] The user explicitly approves the amended scope.
- [ ] Every official requirement maps to implementation or existing evidence.
- [ ] All amended acceptance and release validation passes on the recorded commit.
- [ ] The public submission/evidence is updated without unsupported claims.

## Testing Requirements

No application testing is required while this ticket is externally blocked.
After amendment, specify only tests relevant to the published requirements and
always run lint, typecheck, affected tests, build, and public-origin smoke checks.

## Definition of Done

M18 can be completed only after official Phase 2 criteria exist, the user
approves a fully amended ticket, every published requirement is satisfied with
verifiable evidence, and the affected release checks pass. It cannot be marked
PASS from this placeholder specification.

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
