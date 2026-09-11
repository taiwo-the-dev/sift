# M16 judge-path validation

## Status

**In progress.** The automated mainnet judge path passes. Three real novice
sessions, a manual accessibility spot check, and the owner-controlled wallet
checks are still required.

## Release boundary

The clean judge path defaults to BSC Mainnet while the header selector also
exposes the independent BSC Testnet catalogue. Browser automation never
connects a wallet, enters signing material, or approves a transaction.

## Non-coaching test task

Give the participant only this prompt:

> You need an AI agent on BNB Chain. Use Sift to find one that matches a task,
> understand why it may be suitable, compare it with another option, and reach
> the safest next step you would take to use it. Explain anything that would
> stop you from continuing.

Run four variants using these task goals:

1. improve yield on supplied liquidity;
2. automate a grid trading strategy;
3. monitor a lending position's health factor;
4. rebalance a liquidity position.

Do not explain category names, ERC standards, filters, scores, or the next
button. Help only if the participant is completely blocked, then record the
exact help given.

## What to record

Do not add invented observations. Record one row per real session:

| Session | Date / build | Category | Completed find → understand → compare | Reached safe next action | Time | Wrong turns | Help | Confidence (1–5) | P0/P1 issue |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Not run | Not assigned | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded |
| 2 | Not run | Not assigned | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded |
| 3 | Not run | Not assigned | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded | Not recorded |

Use people unfamiliar with Agent Studio. Ask permission before recording audio,
video, or a screen. Do not collect names, wallet secrets, or personal financial
information.

## Automated evidence

The Playwright suite uses one worker to avoid overloading the free Supabase
project and runs the same seven checks on desktop Chromium and a Pixel 7 viewport:

- landing purpose and natural-language search;
- all four required category routes with real chain-56 results;
- persistent switching between isolated chain-56 and chain-97 catalogues;
- a real mainnet profile and two-agent comparison;
- the Available filter leading to a recently checked task or hire route;
- the disconnected dashboard privacy boundary;
- mobile navigation, keyboard search focus, reduced motion, page errors, and
  horizontal overflow.

Recorded on 2026-09-10:

| Target | Result | Notes |
| --- | --- | --- |
| Local Next.js production build | 14/14 PASS | Includes desktop and mobile dual-network switching |
| <https://sift-ten-swart.vercel.app> | 12/12 PASS | Public baseline at `f2d8883`; repeat after deployment |
| Public release smoke | PASS | Routes, category evidence, metadata, headers, dashboard privacy, 404, and assets |

Run locally:

```bash
npm run test:browser:release
```

Run against the public release:

```bash
PLAYWRIGHT_BASE_URL=https://sift-ten-swart.vercel.app npm run test:browser
npm run release:smoke -- https://sift-ten-swart.vercel.app
```

## Manual mainnet checks

These checks need a human because Sift must never approve a wallet request on
the user's behalf:

1. Open a fresh private browser window and connect a disposable wallet.
2. Keep only the minimum BNB/tokens you are willing to risk in that wallet.
3. Select a mainnet agent whose service was checked recently and open its task
   route.
4. Review the agent, method, amount, token, target contract, and chain ID `56`.
5. First reject the wallet request. Confirm Sift does not show success and lets
   you safely continue or restart.
6. Change accounts and confirm wallet-bound state is cleared or blocked.
7. For a no-spend check, stop before final wallet approval. Confirm no hash or
   completed job appears.
8. Only if you intentionally accept real cost, approve the smallest reviewed
   mainnet action and verify the receipt independently on BscScan.
9. Reload the page and verify the same wallet recovers the job without another
   automatic signature.
10. Open the dashboard with a second wallet and verify it cannot see or resume
    the first wallet's job.

Record only public wallet addresses and transaction hashes that you intentionally
want in the release evidence. Never record a seed phrase or private key.

## Pass condition

M16 can be marked complete only after the three session rows contain real
results, every reproducible P0/P1 issue is fixed and retested, the manual
accessibility/wallet checks pass, and the browser suite passes on the exact
deployed release commit.
