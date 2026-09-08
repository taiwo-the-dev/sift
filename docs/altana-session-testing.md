# Testing Altana protected hiring

This is the beginner test path for M20. Use **BSC Testnet first**. Testnet assets
have no monetary value, but you should still use a disposable test wallet and
read every prompt.

## 1. Check the code

From the Sift repository run:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run test:wallet-ui
npm run build
```

These checks do not create a wallet or send a blockchain transaction.

## 2. Start Sift

Keep your existing hosted Supabase variables in `.env.local`, then run:

```bash
npm run dev
```

Open `http://localhost:3000/permissions`.

## 3. Create the passkey wallet

1. Keep **BSC Testnet** selected.
2. Select **Create passkey wallet**.
3. Approve the normal fingerprint, face-unlock, or device-PIN prompt.
4. Confirm that Sift displays a real `0x…` wallet address.

Sift stores the public credential handle so the passkey can be found again.
The OS protects the passkey. Sift does not receive or save a private key or seed
phrase.

## 4. Fund only what the test needs

Copy the passkey wallet address. Obtain testnet BNB from the official BNB Chain
testnet faucet. If the genuine agent returns a non-zero quote, obtain test-only
`U` using the faucet linked by the BNB Agent SDK. Check that the token address
shown by Sift matches the reviewed testnet deployment.

Never send real assets to the testnet wallet.

## 5. Start a real compatible hire

1. Open Discover and choose a genuine BSC Testnet agent whose profile says it
   supports ERC-8183 hiring.
2. Select **Hire agent**.
3. Keep **Protected session** selected.
4. Enter a non-sensitive test task and a small maximum test-token spend.
5. Request the signed provider quote.
6. On the permission step, read the four allowed actions, exact token cap,
   native gas cap, one-hour expiry, and network.
7. Select **Create one-hour permission** and approve the passkey prompt.
8. Open the KeyStore and grant links. Record the real URLs below only after they
   exist.

## 6. Hire and verify

1. Review the provider, budget, payment token, Commerce contract, and wallet.
2. Continue to the protected hire.
3. For a non-zero quote, select **Approve with passkey**. Sift requests only the
   exact signed amount.
4. Select **Hire with protected session**.
5. Wait for two confirmations. If Sift says the receipt is not ready, use
   **Verify transaction**; do not submit a second hire.
6. Confirm the success page shows the real ERC-8183 job ID and transaction link.
7. Confirm BscScan shows `JobCreated`, `JobRegistered`, `BudgetSet`, and
   `JobFunded` in the same successful transaction.

## 7. Revoke the permission

1. Return to `/permissions`.
2. Keep BSC Testnet selected and choose **Check on-chain status**.
3. Choose **Revoke permission** and approve the passkey prompt.
4. Check again and confirm the status is **Revoked**.
5. Record the real revoke transaction URL below.

## Evidence record

Leave a field blank until you have observed it. Never add a made-up hash.

| Evidence | Real observed value |
| --- | --- |
| Test date/time | |
| Sift deployment or localhost URL | |
| Passkey wallet address | |
| BSC network / chain ID | BSC Testnet / `97` |
| Altana KeyStore address | `0x6b8361C29d05D498b1a12B54A37310f94171E94A` |
| Session grant transaction | |
| Session key ID | |
| Session expiry | |
| Allowed functions reviewed | |
| Token cap reviewed | |
| Atomic hire transaction | |
| ERC-8183 job ID | |
| Revoke transaction | |
| Final KeyStore status | |
| Tester notes | |

## Expected recovery behavior

- Cancelling a passkey prompt must not be shown as success.
- Refreshing the tab intentionally removes the live private session key from
  memory. Its public KeyStore record remains visible and revocable, but you must
  create a fresh session before another protected hire.
- A wrong network, expired quote, expired/revoked session, changed SDK address,
  missing receipt event, or failed database/RPC call must stop confirmation.
- Passkey-wallet jobs are currently verified through their transaction and
  BscScan link; the signed private dashboard currently supports connected EOA
  wallets only.
