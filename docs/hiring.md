# ERC-8183 testnet hiring

M9 implements a client-side wallet checkout for real indexed agents that expose the current BNB Agent SDK ERC-8183 HTTP service. The browser signs transactions; Sift never receives signing material and does not mark a step confirmed until its server independently verifies BSC Testnet calldata, receipt, events, and confirmations.

## Verified protocol selection

The integration was re-verified on 2026-08-23 against the official [ERC-8183 draft](https://eips.ethereum.org/EIPS/eip-8183), [BNB Agent SDK](https://docs.bnbchain.org/developer-kit/bnbagent-sdk/), and the `main` branch of [bnb-chain/apex-contracts](https://github.com/bnb-chain/apex-contracts). ERC-8183 remains a draft standard and APEX is under active development, so Sift validates the deployment relationships at runtime instead of trusting addresses alone.

Sift supports this deployment only:

| Item | Verified BSC Testnet value |
| --- | --- |
| Chain | BSC Testnet, chain ID `97` |
| AgenticCommerce | `0xa206c0517B6371C6638CD9e4a42Cc9f02A33B0DE` |
| EvaluatorRouter | `0xd7d36d66d2f1b608a0f943f722d27e3744f66f25` |
| OptimisticPolicy | `0xd6a4217588f6b1f5657a92a3e94e6422ad771cea` |
| Payment token | `0xc70B8741B8B07A6d61E54fd4B20f22Fa648E5565` (`U`, 18 decimals) |
| Confirmation policy | 2 blocks |

The official deployment source of truth is `apex-contracts/scripts/addresses.ts`. Sift additionally reads live contract bytecode, token, router/commerce relationships, policy whitelist, pause flags, platform fee, token metadata, dispute window, and latest block time before accepting a quote.

## Compatibility and negotiation

An indexed agent is shown as hireable only when all of these are true:

- it is on chain `97`, has currently valid indexed metadata, and is not declared inactive;
- its indexed owner is a valid EVM address;
- it declares an `ERC-8183` service at a public HTTPS endpoint without credentials, query parameters, a private host, or a reserved placeholder hostname;
- its `/status` response exactly matches the indexed owner and verified deployment (an omitted legacy `decimals` field is resolved from the live verified token contract, while a conflicting declared value is rejected);
- its `/negotiate` response accepts the normalized terms, targets the verified deployment and token, remains inside the user's maximum spend, and contains a provider signature that Sift verifies as EIP-191 or ERC-1271.

Negotiation is off-chain; the signed canonical description is then committed to the job. Agent endpoints are fetched server-side with DNS/private-network blocking, manual redirect revalidation, a timeout, and a 64 KB response limit.

## Exact transaction sequence

The current APEX contract requires separate explicit wallet actions:

1. `AgenticCommerce.createJob(provider, router, expiredAt, signedDescription, router)`;
2. `EvaluatorRouter.registerJob(jobId, policy)`;
3. `AgenticCommerce.setBudget(jobId, signedPrice, 0x)`;
4. `U.approve(commerce, signedPrice)` only when the live allowance is below the price;
5. `AgenticCommerce.fund(jobId, signedPrice, 0x)`.

Sift simulates each call before requesting a signature. Approvals are exact, never unlimited. The server verifies chain ID, sender, destination, zero native value, decoded arguments, receipt status, expected protocol event, two confirmations, and the final funded job state. The job expiry is compared with the mined block timestamp, not the later API verification time.

## Persistence and resume security

Migration `20260823090000_add_hiring_jobs.sql` adds `jobs`, `job_transactions`, and `job_activity`. These service-role-only tables have Row Level Security enabled and no browser policy. Unique idempotency, chain/job, step, and transaction constraints prevent duplicate records.

Before the first wallet prompt, the server persists the exact normalized mission and signed quote. The browser keeps a random 256-bit resume capability in local storage; only its SHA-256 digest is stored in PostgreSQL. A reload can check or resume a pending step, but no transaction is automatically signed or sent. A different connected wallet cannot resume the job.

If the connected account changes before any blockchain transaction exists,
the wallet step can explicitly cancel the untouched database intent and return
to the populated mission form for a fresh quote. Once a transaction has been
submitted or an on-chain job ID exists, restart is disabled and the original
wallet is required; this prevents silently abandoning or duplicating an
on-chain job.

## Testnet demo prerequisites

Use a disposable test wallet. Never paste or commit its private key.

1. Configure the hosted Supabase variables described in [database.md](database.md), deploy all migrations through the GitHub integration, and confirm the M9 migration succeeded.
2. Optionally configure `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` for QR/mobile wallets. An installed injected browser wallet works without it.
3. Add BSC Testnet (chain ID `97`) to the wallet.
4. Get testnet BNB for gas from the [official BNB Chain faucet](https://www.bnbchain.org/en/testnet-faucet).
5. Get test-only `U` from the [U faucet listed by the BNB Agent SDK](https://united-coin-u.github.io/u-faucet/) when the selected quote is above zero. Confirm the token address before using it.
6. Start Sift, open a compatible agent profile, select **Hire agent**, enter non-sensitive test terms, and review the signed price and contracts.
7. Confirm each displayed transaction in the disposable wallet. Rejecting a prompt should leave an honest resumable cancelled state; reloading should recover a submitted transaction without another automatic signature request.
8. Confirm the funding transaction and job ID through the testnet BscScan link shown by Sift.

For a zero-priced provider quote, no test token balance or approval is required, but the wallet still needs testnet BNB for contract gas.

## Known limitations

- ERC-8183 and BNB APEX are active-development testnet infrastructure. A deployment rotation intentionally makes Sift fail closed until its typed constants are reviewed and updated.
- Only safe, exact ERC-8183 declarations are hireable; stale, local, malformed, or unreachable endpoints remain visible as declarations but cannot produce a Sift hiring flow.
- M9 confirms job creation and escrow funding. It does not claim the provider delivered work or the evaluator accepted it.
- M10 monitors persisted jobs and verified protocol state. Refunds, disputes, pause, and revoke controls remain omitted because the current verified Sift client does not implement those writes.
- Mainnet hiring is deliberately blocked.

## Validation

Run:

```bash
npm run lint
npm run typecheck
npm test
npm run test:wallet-ui
npm run build
```

The automated tests use clearly labelled deterministic fixtures and never write fabricated agent or chain data to the hosted catalogue. A real happy-path transaction still requires a human to approve each request in a disposable testnet wallet.
