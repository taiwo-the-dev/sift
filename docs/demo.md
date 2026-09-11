# Sift hackathon demo

This is the repeatable BSC Mainnet demo. It uses real indexed records. Wallet
actions involve real assets, so the default demo stops safely before approval
unless the owner has explicitly chosen and funded a minimal transaction.

## Before the demo

1. Confirm the exact commit and open items in
   [release-checklist.md](release-checklist.md).
2. Run the public smoke and browser checks from a clean checkout.
3. Run `npm run report:catalogue`; require the chain-56 checkpoint to equal its
   recorded confirmed head.
4. Run `npm run report:categories`; require PASS, three curated agents, and
   three current 8004scan checks in every category.
5. Open the Available filter and pre-check the chosen real service because an
   external owner can change it at any time.
6. If demonstrating a wallet boundary, use a disposable wallet with only the
   minimum mainnet funds you accept risking. Never share its seed phrase or key.
7. Complete the Agent Studio/SDK readiness record in
   [activation-proof.md](activation-proof.md).

## Five-minute script

| Time | Action | Expected evidence |
| --- | --- | --- |
| 0:00 | Open the landing page | Sift's purpose and primary search are immediately clear. |
| 0:25 | Enter a plain-language goal | Discovery opens on BSC Mainnet and keeps the query in the URL. |
| 0:50 | Show the four category filters | Every category has real results and distinguishes declared from suggested evidence. |
| 1:20 | Open a curated agent | Identity, owner, categories, services, freshness, health, reputation, and Sift Score show real evidence or an honest unavailable state. |
| 2:00 | Compare two agents | The URL-backed view explains differences without treating missing evidence as zero. |
| 2:35 | Filter by Available | A recently checked agent leads to its supported method-aware action. |
| 3:00 | Configure and review a task | The page shows the agent, method, inputs, price/permissions where applicable, chain, and safety boundary. |
| 3:45 | Demonstrate rejection or stop before approval | Sift must not create a transaction hash or success message. Explain that no mainnet write occurs automatically. |
| 4:20 | Open the dashboard | Show the signed wallet boundary and any real prior job evidence only when it belongs to the connected wallet. |

## Optional real mainnet evidence

Only the owner decides whether to perform this step:

1. Use a new disposable wallet, not a wallet holding valuable assets.
2. Confirm chain ID `56`, agent, target contract, method, amount, token, and
   expected gas in both Sift and the wallet.
3. Reject once first and confirm recovery.
4. If the reviewed cost is acceptable, approve the smallest intended action.
5. Verify the receipt and job relationship independently on BscScan.
6. Reload and confirm there is no duplicate signing.
7. Verify dashboard access with the hiring wallet, then denial with a second wallet.

A prepared request is not execution. Do not add a transaction claim unless a
real BscScan receipt exists.

## Recovery under demo pressure

| State | Recovery |
| --- | --- |
| Catalogue unavailable | Disclose the outage and retry after Supabase/indexer recovery; never substitute screenshots as live data. |
| No category result | Keep the honest empty state; never relabel another agent. |
| Score, health, or reputation unavailable | Explain that Sift withholds evidence it cannot verify. |
| Service rejects a request | Return to a currently checked option or disclose the external failure; never edit a quote or response. |
| Wallet is on another network | Use the explicit BSC Mainnet switch and verify chain ID `56`. |
| User rejects a request | Show the cancelled/resumable state; no automatic retry should occur. |
| Transaction is pending | Use its BscScan link and do not submit a duplicate. |
| Dashboard verification fails | Confirm account, origin, wallet clock, and hosted migration; request a fresh one-time challenge without weakening verification. |

The default no-spend demo is complete when the real discovery-to-review journey
and rejection boundary work. A successful hire is claimed only after an
owner-approved mainnet receipt and dashboard evidence are independently verified.
