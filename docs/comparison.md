# Agent comparison

M7 adds evidence-led comparison for two to four real indexed agent identities. It does not create comparison records, add a database migration, or change the M6 Sift Score formula.

## Selection state

Every selection uses the canonical public identity `{ chainId, agentId }`. The shareable form uses repeated parameters:

```text
/compare?agent=97%3A1883&agent=97%3A1887&goal=Protect+my+loan+from+liquidation
```

Before any database request, Sift validates both identifiers with the profile-route rules, keeps the first occurrence of each identity, and caps the list at four. Invalid, duplicate, and over-limit entries are ignored and reported without exposing database details.

Discovery and profile controls use a small `localStorage` selection for immediate cross-page interaction. It contains only public agent references and the optional goal—never wallet, account, or sensitive user data. The Compare navigation serializes that state into the URL. On `/compare`, the validated URL is canonical and synchronizes the convenience state, which makes shared links reproducible.

## Data access

The server-rendered comparison route performs one bounded repository operation:

1. One exact-identity query loads up to four selected agent records.
2. Parallel bounded bulk queries load services, health, reputation, persisted
   Sift Scores, versioned category evidence, and optional cached 8004scan
   cross-checks for the resulting database IDs.
3. Existing profile composition maps each evidence set without client access to database credentials.

There is no per-agent query loop. Missing identities and identities that are ambiguous across registries remain unavailable. Internal database IDs never enter the URL or UI.

## Contextual match rule

The match is deterministic and goal-specific. It is not a universal agent ranking.

For each available selected agent:

- a supported goal category inferred by the documented M4 intent rules and present in the agent's resolved categories contributes 4 contextual points;
- each distinct, non-generic goal term found as a whole term in the agent's indexed name, description, category, declared service type/version, or structured capability contributes 1 point;
- fewer than 2 contextual points is insufficient to highlight a candidate;
- a unique highest contextual total is highlighted;
- when contextual totals tie, Sift can use Sift Score only if every tied candidate has a numeric, current, moderate-or-higher-confidence persisted score;
- an equal score tie, a stale/withheld/low-confidence score, or any missing score leaves the match unresolved.

Unknown evidence is never converted to zero and never loses a tie to known evidence. The UI explains the supported signals used for a highlight and explicitly states that the result is decision support, not a safety guarantee.

## Displayed evidence

The comparison presents only supported persisted or documented derived values:

- Sift Score, confidence, evidence coverage, versioned breakdown, and freshness;
- sourced reputation and verified activity where present;
- bounded observed health and observation time;
- resolved categories and their source;
- category classification confidence, rule version, observation time, and
  source-backed category-specific facts;
- optional 8004scan cross-check availability/conflicts and observation time;
- declared capabilities, services, versions, ERC-8004 identity, and x402 declaration state;
- metadata verification and index times.

The current indexed schema has no attributable cost or risk-classification fields. Those cells say `Unknown` with that limitation instead of inventing values.

Declared and inferred category evidence remain visibly different. An 8004scan
conflict is shown as a conflict and never changes the locally indexed identity.
Every category uses the same comparison rows; absent facts remain Unknown.

Desktop uses a semantic table with column and row headers inside its own bounded scroller. Mobile uses stacked agent groups with the same labelled evidence. Contextual highlighting includes text and an icon, not color alone.

## Validation

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Browser coverage should include add/remove/replace/clear, the four-agent limit, goal preservation, shared URLs, missing identities, keyboard activation, table associations, and a 390px viewport with no page-level horizontal overflow.
