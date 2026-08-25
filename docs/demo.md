# Sift hackathon demo

This is the repeatable release-candidate demo. It uses real indexed BNB Chain
records and a disposable BSC Testnet wallet. Never use a wallet that holds
valuable mainnet assets and never share its private key or seed phrase.

## Before the demo

1. Confirm the release record and every required item in
   [release-checklist.md](release-checklist.md).
2. Run `npm run release:smoke -- https://<production-origin>` from a clean
   checkout of the recorded commit.
3. Run `npm run report:catalogue` and confirm a non-zero, non-partial BSC
   mainnet catalogue plus the latest indexer and assessment workflows. If any is
   stale or failing, disclose the catalogue timestamp and resolve the workflow
   before the live demo.
4. In a clean browser profile, identify one currently indexed profile with a
   valid public ERC-8183 service. Complete `/status` and `/negotiate` before the
   audience arrives; compatibility can change outside Sift.
5. Prepare a disposable wallet on BSC Testnet (chain ID `97`) with testnet BNB
   for gas and, if the signed quote is non-zero, test-only `U`. Verify the token
   and protocol addresses shown by Sift against [hiring.md](hiring.md).
6. Keep the BSC Testnet explorer, the chosen profile, and the release recovery
   notes open in separate tabs. Do not preload a fabricated or unlabeled job.

## Five-minute script

| Time | Action | Expected evidence |
| --- | --- | --- |
| 0:00 | Open the landing page | “Find the right AI agent for the job” is understandable immediately; featured/recent records are real or honestly unavailable. |
| 0:25 | Describe a goal in plain language | `/discover` opens on BSC Mainnet by default, keeps the query in the URL, and shows transparent inferred-category and checkpoint context. |
| 0:50 | Open each category filter briefly | Yield optimisation, trading automation, health-factor monitoring, and liquidity rebalancing each produce a real result set or a clear honest empty state. |
| 1:20 | Open a current agent | Identity, owner, metadata provenance, services, health, reputation, and Sift Score show their source/freshness or `Unknown`. |
| 2:00 | Add two or three agents to comparison | The URL-backed comparison explains score/evidence differences without converting missing evidence into zero. |
| 2:40 | Switch discovery to the clearly labelled testnet catalogue, then connect the disposable wallet | The catalogue change is explicit; the UI reports the address/network and requests an explicit switch if the wallet is not on BSC Testnet. Mainnet profiles offer no transaction path. |
| 3:00 | Open the compatible agent's hiring flow | Review mission, permissions, signed quote, contract addresses, token, price, expiry, and required transaction sequence. |
| 3:35 | Approve each requested testnet action | Each transaction is user-approved, simulated, then independently verified. Rejections remain recoverable and are never labelled confirmed. |
| 4:35 | Open the dashboard | Sign the read-only ownership challenge, then show the wallet-scoped job, transaction links, and provenance-labelled activity. |

## Wallet and funding procedure

1. Create a new wallet solely for the hackathon demo. Back it up privately; do
   not commit, paste, screen-record, or publish its secret material.
2. Add BSC Testnet with chain ID `97` using the wallet's network UI.
3. Request testnet BNB from the official BNB Chain faucet linked in
   [hiring.md](hiring.md). Share only the public address if a faucet requires it.
4. For a non-zero quote, request test-only `U` from the documented faucet and
   verify the token address in the wallet before accepting an approval.
5. Keep only the minimum disposable test funds required. Sift blocks mainnet
   hiring, uses exact token approval amounts, and never asks for a seed phrase.

## Recovery under demo pressure

| State | Recovery |
| --- | --- |
| Catalogue unavailable | Do not use screenshots as fake live behavior. Show the recorded screenshot only as a clearly labelled reference, disclose the outage, and retry after Supabase/indexer health is restored. |
| No result in one category | Keep the honest empty state visible and explain that category mapping is deterministic over currently indexed declarations. Never relabel another agent. |
| Score or health is `Unknown` | Explain the minimum-evidence and freshness rule. Choose another current profile only if it genuinely has persisted evidence. |
| Compatible service rejects negotiation | Return to the pre-validated profile or disclose the upstream failure. Never hand-edit a quote or bypass signature verification. |
| Wallet is on the wrong network | Use Sift's explicit BSC Testnet switch action and approve chain ID `97` in the wallet. |
| User rejects a signature/transaction | Show the cancelled/resumable state. No automatic retry or hidden transaction should occur. |
| Submitted transaction is pending | Reload the saved intent and use its BscScan link. Do not submit a duplicate transaction. |
| Dashboard verification fails | Confirm the connected account, chain, deployment origin, M10 migration, and wallet clock. Reissue a new one-time challenge; never weaken verification. |

The demo is not complete until the funded job and resulting dashboard activity
are verified against BSC Testnet by a human-controlled wallet.
