# Smart Money Era hackathon readiness audit

Audit date: 2026-08-24

## Verdict

Sift is a strong, unusually direct fit for the main-track problem, but the
current release candidate is **not winner-ready yet**. The product already
covers discovery, profiles, evidence-aware scoring, comparison, wallet
connection, a guarded testnet hiring flow, and a wallet-scoped dashboard. The
remaining weaknesses are submission-critical rather than cosmetic: the app is
not yet publicly deployed, the indexed catalogue contains no BSC mainnet
identities, source freshness is not current, category depth is uneven, and a
real end-to-end activation has not been recorded.

No implementation can guarantee a win. The roadmap below closes the gaps that
are directly measurable against the published judging criteria.

## Sources and interpretation

- [The Smart Money Era official brief](https://www.bnbchain.org/en/hackathons/smart-money-era?tab=tracks)
  is the controlling event source. It requires a functional public submission,
  agents live on BSC, an end-to-end land/find/understand/activate journey,
  accurate real-time decision-grade data, and equally deep treatment of all
  four categories.
- [BNB Chain's hackathon evaluation guide](https://www.bnbchain.org/en/blog/the-ultimate-guide-to-how-we-evaluate-hackathons-at-bnb-chain)
  is supporting guidance, not a replacement for the event-specific rules. It
  emphasizes usability and architecture documentation, a public and licensed
  repository, safe environment configuration, deployability, meaningful BNB
  Chain integration, innovation, and a credible growth plan.
- The official brief says more Phase 2 criteria will be announced. Those
  requirements are unknown and must not be guessed.

The phrase "agents ... live on BSC" is treated conservatively as requiring a
BSC mainnet catalogue. Even if organizers later confirm that testnet agents are
eligible, mainnet discovery is still the stronger judging position.

## Current evidence snapshot

The following was observed from the configured hosted database on 2026-08-24.
It is a point-in-time engineering measurement, not a product claim:

| Evidence | Observed |
| --- | ---: |
| Indexed BSC mainnet identities (chain 56) | 0 |
| Indexed BSC Testnet identities (chain 97) | 1,890 |
| Valid metadata records | 947 |
| Persisted Sift Scores | 201 |
| Indexed service records | 1,100 |
| Service records whose type mentions ERC-8183 | 82 |
| Yield Optimisation category matches | 21 |
| Grid Trading category matches | 92 |
| Health Factor Monitoring category matches | 15 |
| Liquidity Rebalancing category matches | 29 |

The M12 release record also shows that index, health, and score evidence was
last persisted on 2026-08-22, the Vercel URL is not recorded, and no completed
BSC Testnet demo transaction is recorded.

## Main-track scorecard

| Requirement | Status | Evidence and gap |
| --- | --- | --- |
| Product/problem fit | Pass | Sift directly implements the requested BNB agent marketplace narrative. |
| Land and understand | Pass locally | Landing, discovery, profile, score, and comparison journeys exist, subject to final browser validation. |
| Find by all four categories | Partial | All four return real indexed records, but the 15-to-92 spread does not demonstrate equal depth. |
| Activate with minimal friction | Not proven | The guarded ERC-8183/APEX flow exists on BSC Testnet, but one real successful full journey and receipt are not recorded. |
| No dead ends for a new user | Partial | Honest unsupported states exist, but compatible activation coverage per category and novice testing are not proven. |
| Real-time, accurate data | Needs correction | Provenance and Unknown states are strong; scheduled freshness is stale and score coverage is limited. |
| Decision-grade data | Partial | Profiles, services, health, reputation, and Sift Score exist, but coverage and category-specific decision fields need measurement and improvement. |
| Agent diversity | Needs correction | Four-category presence exists; equal depth and comparable category-specific evidence do not. |
| Agents live on BSC | High-risk fail | The hosted catalogue currently has zero chain-56 records and 1,890 chain-97 records. |
| Functional public URL | Fail | M12 records no production URL or production-origin smoke test. |
| Open-source submission quality | Partial | The repo has setup/architecture/demo documentation and safe env handling, but no root open-source license is present. |
| BNB integration evidence | Partial | ERC-8004 indexing and ERC-8183 testnet integration exist; final explorer-linked activation evidence is missing. |
| Phase 2 | Blocked externally | Criteria have not been published. |

## Partner-track position

- Altana is not currently eligible: Sift does not implement agent-owned Altana
  wallets, scoped sessions, keystore registration, session-key transactions,
  or in-product revocation. Adding this now would distract from the main-track
  gaps.
- TermiX is not currently eligible: the required Agent Advantage Report with
  three controlled real-task comparisons and attached outputs does not exist.
- PancakeSwap is not currently eligible: Sift has not proven a real
  PancakeSwap trader or LP benefit delivered by an agent.

The recommended strategy is to finish the main track first. Partner tracks
should receive separate optional tickets only after the main judging path is
green and only with real agents, outputs, and transactions.

## Official tooling decision

The project owner has required meaningful use of the official main-track
resources even when a tool is not an eligibility requirement. M14 therefore
requires a non-critical 8004scan Pro API enrichment, and M15 requires real BNB
Agent Studio CLI/TypeScript SDK compatibility plus official BSC testnet network,
faucet, and explorer evidence. See `docs/hackathon-tooling.md` for boundaries.

Partner products remain separately scoped because they materially change the
product or security model.

## Controlled remediation roadmap

1. [M13 — Main-track eligibility and BSC mainnet catalogue](tickets/TICKET-013-m13-main-track-eligibility.md)
2. [M14 — Category parity and decision-grade data](tickets/TICKET-014-m14-category-parity-data-quality.md)
3. [M15 — Frictionless activation proof](tickets/TICKET-015-m15-frictionless-agent-activation.md)
4. [M16 — Judge-path validation](tickets/TICKET-016-m16-judge-path-validation.md)
5. [M17 — Public launch and submission package](tickets/TICKET-017-m17-public-launch-submission.md)
6. [M18 — Phase 2 response](tickets/TICKET-018-m18-phase-two-response.md),
   blocked until the organizer publishes the missing criteria.

These tickets are remediation and release work only. They do not authorize
automatic implementation of the next milestone.
