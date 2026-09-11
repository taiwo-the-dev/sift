# Wallet job dashboard

M10 adds `/dashboard` as a read-only control centre for real M9 job records. It does not treat a submitted mission as proof that an agent executed it, and it does not display fabricated KPIs, timelines, completion, performance, or management controls.

## Access boundary

Connecting a wallet does not prove to the server that the browser controls it. The dashboard therefore uses a short-lived signed challenge:

1. The server creates a random five-minute challenge bound to the request origin, wallet, and connected supported BSC network.
2. The wallet signs a plain read-only message. No transaction, approval, or spending permission is requested.
3. The server verifies the signature through viem, consumes the challenge once, and issues an opaque four-hour HttpOnly session.
4. `/api/dashboard` compares the connected-wallet header with the server session and queries jobs using only the verified session wallet.

Raw challenge and session tokens are never stored in PostgreSQL. Only SHA-256 digests are persisted. `anon` and `authenticated` roles have no access to the session tables.

## Status rules

- **Pending** covers wallet and transaction steps not yet confirmed.
- **Active** requires persisted funding confirmation; live ERC-8183 `Funded` or `Submitted` state refines the label.
- **Completed** is shown only when `getJob` returns the ERC-8183 `Completed` state.
- **Failed / cancelled** covers persisted failures/cancellation and verified `Rejected` or `Expired` protocol states.

If a live RPC read fails, Sift retains the last persisted transaction evidence, marks current protocol verification unavailable, and sets the response to partial. It never converts expiry time alone into proof of completion or protocol expiry.

## Activity provenance

The timeline is built only from `job_activity`. Every entry is labelled as an application record, indexed observation, or on-chain evidence. Transaction links are emitted only for valid hashes and use the job's BSC Mainnet or BSC Testnet explorer. No activity record means unavailable activity evidence, not proven inactivity.

## Refresh behavior

TanStack Query refreshes active or pending collections at most every 15 seconds. Background-tab polling is disabled and polling stops when every displayed job is completed or failed/cancelled. Users can request a refresh explicitly.

## Unsupported controls

Pause and revoke are absent. The current verified APEX/ERC-8183 client ABI does not expose a Sift-verified enforceable pause/revoke method for a job, so rendering those actions would imply a capability the application cannot safely perform.

## Hosted deployment checklist

1. Commit and push `20260824100000_add_dashboard_wallet_sessions.sql`.
2. Confirm the Supabase GitHub integration applies it successfully.
3. Verify both dashboard tables have RLS enabled and no `anon`/`authenticated` privileges.
4. Open `/dashboard` disconnected, on the wrong network, and with wallets on each supported BSC network.
5. Sign the read-only message and verify that only that wallet's jobs appear.
6. Repeat with a second labelled wallet to verify there is no cross-wallet data exposure.
7. Test an empty wallet, a pending/rejected job where available, manual refresh, reload persistence, and a mobile viewport.

## Activation handoff

The funded confirmation screen now links directly to `/dashboard`. The user
must keep the hiring wallet connected and complete the existing read-only
ownership signature; the local hiring resume capability is not accepted as
dashboard authorization. Record confirmed reload, dashboard recovery, and a
second-wallet denial in [the M15 activation evidence](activation-proof.md).
