# Sift submission package

This document is the single source for M17 submission materials. Replace only
the fields marked `Owner required` with real information. Do not invent usage,
team, transaction, or partnership claims.

## Submission fields

| Field | Current value |
| --- | --- |
| Product | Sift |
| Tagline | Find the right AI agent for the job. |
| One-line description | Sift helps people discover, compare, and safely use BNB Chain AI agents using real ERC-8004 identities and evidence-backed trust signals. |
| Public application | <https://sift-ten-swart.vercel.app> |
| Public repository | <https://github.com/taiwo-the-dev/sift> |
| Supported release network | BSC Mainnet, chain ID `56` |
| ERC-8004 registry | [`0x8004a169fb4a3325136eb29fa0ceb6d2e539a432`](https://bscscan.com/address/0x8004a169fb4a3325136eb29fa0ceb6d2e539a432) |
| Release commit | Owner required after the candidate is committed and deployed |
| Vercel deployment ID | Owner required |
| Team name and members | Owner required |
| Contact details | Owner required |
| License | Owner decision required |
| Demo video | Owner required |
| Pitch deck | Owner required |
| Mainnet task/hire evidence | Owner-controlled validation required |

## Product narrative

BNB Chain has a growing catalogue of registered AI agents, but raw registration
data does not tell a user which agent fits a job or whether its published
service is currently usable. Sift turns those registrations into a searchable
marketplace with readable profiles, side-by-side comparison, current service
checks, bounded health observations, transparent scoring, and method-aware task
flows. Missing evidence stays unavailable instead of becoming demo data.

## Judge demo outline

1. Start on the landing page and describe Sift in one sentence.
2. Search for a real task in plain language.
3. Open each hackathon category and show real BSC Mainnet results.
4. Open one profile and explain identity, service freshness, health, and why a
   Sift Score can be withheld.
5. Compare two agents and point out that Unknown remains different from poor.
6. Filter by Available and open the method-aware next action.
7. Review the safety boundary before any wallet approval.
8. Show the wallet-protected dashboard and the public BscScan evidence only if
   a real transaction was intentionally completed.
9. Close with the own indexer, hosted evidence pipeline, and approximately-$0
   architecture.

## Evidence ready today

- Public mainnet catalogue with a current confirmed checkpoint.
- Four source-backed category inventories and a curated three-agent shortlist
  per category.
- Twelve current, separately labelled 8004scan cross-checks.
- Bounded service, health, and score workers that preserve unavailable states.
- Public application and repository.
- Passing public route/security smoke check.
- Passing mainnet desktop and mobile browser suite.

## Evidence still needed from the owner

1. Approve a standard open-source license.
2. Confirm every hosted migration and RLS/browser-role boundary.
3. Commit and push the candidate, then record the exact Vercel deployment.
4. Confirm the mainnet sync and assessment GitHub Actions pass on that commit.
5. Run three novice judge-path sessions and record anonymized results.
6. Complete the manual wallet rejection/account-change/two-wallet checks.
7. Decide whether to perform a minimal real mainnet transaction; do not claim
   one if you stop before confirmation.
8. Add current screenshots, a short deck, a demo video, team information, and
   final submission-form fields.
9. Rehearse the demo twice in clean browser profiles.
10. Review the repository, Vercel, Supabase, Actions logs, screenshots, and
    video for secrets.

## Suggested five-slide deck

1. **Problem:** finding a registered agent is not the same as trusting or using it.
2. **Product:** discovery, profiles, comparison, evidence, and safe next actions.
3. **How it works:** ERC-8004 → Sift Indexer → Supabase → Next.js, with scheduled
   service/health/score checks and optional 8004scan validation.
4. **Live proof:** mainnet checkpoint, category coverage, public demo, browser
   validation, and any owner-approved transaction evidence.
5. **Path forward:** broader verified service support, more evidence coverage,
   sustainable operator tooling, and carefully reviewed transaction methods.

## Release rule

The package is ready only when every public claim matches the exact deployed
commit. A locally passing candidate, an unsigned wallet request, or a screenshot
of prepared calldata is not a successful mainnet hire.
