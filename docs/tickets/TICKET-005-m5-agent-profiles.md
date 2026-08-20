# TICKET-005 — M5 Agent Profiles

## Status

Ready

## Depends On

M4 — Discover Marketplace

## Objective

Create professional, data-driven agent profile pages that translate indexed ERC-8004 identity, metadata, services, and available evidence into an understandable product view at `/agents/[chainId]/[agentId]`.

## Product Context

Discovery narrows the catalogue, but users need a trustworthy place to understand what an agent claims to do, who operates it, which services it exposes, what evidence is available, and what remains unknown. Profiles are Sift's primary decision surface before comparison or hiring.

## Scope

- Create the dynamic route `/agents/[chainId]/[agentId]`.
- Resolve profiles by validated chain ID and agent ID through the M2/M4 repository layer.
- Build a profile header that shows available name, description, category, registration/verification context, and last verified/synced information.
- Implement structured sections or tabs for:
  - Overview;
  - Capabilities;
  - Activity where verifiable data exists;
  - Technical details.
- Include Performance and health/reputation sections only when supported values exist; otherwise use an honest unavailable state or omit the section.
- Show service types, supported protocols/capabilities, and endpoints only as allowed by the source metadata.
- Keep chain ID, registry address, agent ID, owner address, agent URI, service endpoints, supported standards, and similar raw fields in the Technical area.
- Add copy affordances for appropriate identifiers with accessible feedback.
- Add sanitized BNB Chain explorer links for supported addresses, blocks, and transactions where applicable.
- Add metadata provenance and last-known-good/last-verified messaging.
- Add not-found, invalid-identifier, loading, metadata-error, and partial-data states.
- Make cards in `/discover` link to the correct profile route.
- Present future Compare, Try, or Hire actions only if they are clearly unavailable; prefer omitting actions that do nothing.

## Out of Scope

- Running endpoint health checks or generating new availability data.
- Calculating or displaying Sift Score unless M6 has subsequently supplied a real persisted score; do not pre-implement scoring.
- Comparison selection or `/compare` behavior.
- Wallet connection or network switching.
- Mission configuration, hiring transactions, jobs, or dashboard activity.
- Editing agent metadata or ownership.
- Inventing performance charts, availability, activity, or reputation.

## Technical Requirements

- Use Next.js App Router dynamic routing and Server Components by default.
- Validate route parameters before querying and return a real not-found response when no indexed agent matches.
- Fetch profile data through an agent-profile repository/service that composes agents, services, and available evidence efficiently.
- Avoid N+1 service or evidence queries.
- Keep profile header, overview, capability, evidence, technical, copy, and fallback components composable.
- Use accessible tabs only if tabs improve the information architecture; tabs must support keyboard navigation and deep-linking where practical.
- Sanitize and allowlist explorer and external metadata links.
- Format addresses, identifiers, timestamps, and unknown values consistently through tested utilities.
- Preserve the established Sift design language and do not let raw Web3 details dominate the page.
- Generate metadata for each profile from verified indexed content, with safe fallbacks.

## Data Integrity Requirements

- Show only persisted indexed fields and evidence traceable to source data.
- Never fabricate reputation, successful jobs, task counts, prices, APY, online status, response time, activity, or transactions.
- Distinguish declared metadata capabilities from independently verified behavior.
- Label stale last-known-good metadata and show the last successful verification time.
- Use `Unknown`, `Not available`, or omission for missing fields.
- Do not derive a Sift Score, risk level, or performance claim in this milestone.
- Ensure all displayed chain and registry identifiers correspond to the requested profile.

## Security Requirements

- Validate chain IDs, agent IDs, addresses, URIs, and any rendered external links.
- Prevent `javascript:`, unsafe data URLs, and untrusted redirect targets.
- Do not render remote metadata as HTML.
- Do not expose internal database identifiers, privileged errors, credentials, or server stack traces.
- Treat copied endpoint and owner data as untrusted text.

## UX Requirements

- A user should understand the agent's purpose and evidence before seeing technical identifiers.
- Unknown and stale data must have clear, non-alarming explanations.
- The profile must remain useful when images, reputation, health, or service details are absent.
- Technical information must be scannable, copyable, and secondary to the user-facing overview.
- Mobile layouts must keep the main identity and evidence readable without horizontal tables.
- Loading, error, partial-data, and not-found states must provide useful next actions back to discovery.
- All controls need visible focus states, labels, and adequate contrast.

## Acceptance Criteria

- [ ] `/agents/[chainId]/[agentId]` renders the correct real indexed agent.
- [ ] Invalid identifiers and missing agents produce a polished not-found state.
- [ ] The header and overview prioritize human-readable agent purpose.
- [ ] Capabilities/services and technical identifiers are shown from real source data.
- [ ] Declared capabilities are not misrepresented as verified performance.
- [ ] Last verified/synced and stale metadata states are communicated clearly.
- [ ] Explorer and external links are sanitized and point to the correct chain context.
- [ ] Discover cards link to valid profile routes.
- [ ] Missing health, reputation, activity, and performance data uses honest fallbacks.
- [ ] No comparison, wallet, hiring, or scoring functionality is implemented early.
- [ ] Responsive, keyboard, loading, error, and partial-data states pass review.
- [ ] Lint, typecheck, relevant tests, browser testing, and production build pass.

## Testing Requirements

- Unit-test route parsing, identifier formatting, explorer URL construction, fallback labels, and capability/provenance formatting.
- Integration-test profile repository composition for complete and partial agents.
- Browser-test a complete profile, a sparse profile, invalid identifiers, not found, copy actions, links, keyboard navigation, and mobile layout.
- Test that unsafe URLs are rejected or rendered as inert text.
- Run `npm run lint`, typecheck, relevant tests, and `npm run build`.

## Definition of Done

M5 is complete when every discoverable real agent has a stable, responsive profile route that communicates purpose, indexed capabilities, provenance, technical details, and unknown/stale states accurately, links safely to relevant explorers, and does not begin M6 scoring or later transactional features.

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
