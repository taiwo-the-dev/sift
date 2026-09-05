# M15 activation proof

This record separates repository readiness from real-world proof. M15 remains
**BLOCKED** until all four category representatives and one complete
human-approved BSC Testnet job are recorded below. Empty evidence is never
replaced with a fixture, screenshot, or invented transaction.

## Official tooling baseline

Sift pins the official tools as development-only dependencies so neither CLI
scaffolding nor the SDK enters the production web bundle:

| Tool | Exact version | Purpose |
| --- | --- | --- |
| `@bnbagent/studio-cli` | `0.0.13` | Read-only Studio project scan and ERC-8004 identity resolution |
| `@bnbagent/sdk` | `0.5.5` | Independent deployment/address compatibility check |

Node.js 22 or newer is required by the current Agent Studio CLI. The official
references are the [Agent Studio quickstart](https://docs.bnbchain.org/developer-kit/bnbchain-studio/quickstart/),
[CLI reference](https://docs.bnbchain.org/developer-kit/bnbchain-studio/cli-reference/),
[TypeScript SDK guide](https://github.com/bnb-chain/bnbagent-sdk/blob/main/typescript/README.md),
and [SDK network registry](https://docs.bnbchain.org/developer-kit/bnbagent-sdk/networks/).

Run the non-mutating checks from Sift:

```bash
nvm use
npm ci
npm exec -- bag --version
npm run studio:scan
npm run verify:activation -- \
  --studio-project=/absolute/path/to/the/genuine/studio-project \
  --candidate=yield-optimisation:<agent-id> \
  --candidate=grid-trading:<agent-id> \
  --candidate=health-factor-monitoring:<agent-id> \
  --candidate=liquidity-rebalancing:<agent-id>
```

`studio:scan` is read-only. The verification script uses
`bag erc8004 resolve <agent-id> --network bsc-testnet` from the supplied real
Studio project, compares the SDK's chain-97 deployment with Sift, loads the
real indexed identity/category evidence, and validates the live `/status`
document. It deliberately does not deploy an agent, negotiate a paid task, use
a private key, or submit a transaction.

## Central compatibility contract

The static gate in `features/hiring/compatibility.ts` requires:

1. BSC Testnet identity (`chainId = 97`);
2. validated indexed metadata and an identity not declared inactive;
3. a valid indexed EVM owner;
4. an ERC-8183 service using a reviewed `0.x`, `1.x`, or unversioned declaration;
5. a public HTTPS endpoint with no credentials, query string, placeholder host,
   non-standard port, or unsafe derived status/negotiation URL.

A static pass only opens the flow. Before persistence or a wallet request, Sift
also binds and revalidates the indexed owner, signed provider, mission, chain,
verified Agentic Commerce contract, payment token, finite price/maximum,
quote expiry, connected account, exact allowance, transaction calldata, job
relationship, receipt, events, and confirmations. The official SDK `0.5.5`
currently agrees with Sift's chain-97 commerce, router, policy, and U-token
addresses. Any future disagreement fails closed.

## Novice path and recovery

The supported journey is:

```text
Find → Understand → Configure → Review → Connect/Switch → Sign → Confirm → Monitor
```

- Unsupported profiles explain the first failed check and link to declared
  ERC-8183 alternatives, with the same category retained when available.
- Mission text is saved only in local browser storage. It contains no quote,
  signature, allowance, transaction, wallet session, or secret.
- Changing a wallet keeps mission text but clears a wallet-bound quote. An
  untouched saved intent may be explicitly cancelled and restarted. Once any
  chain activity exists, only the original wallet may continue.
- Wrong-network, rejection, stale quote, pending receipt, reload, replacement,
  failed receipt, and duplicate-click states remain explicit and resumable.
- Every write is simulated and requested separately. Gas is estimated by the
  wallet, approvals are exact rather than unlimited, and no write is retried or
  signed automatically.
- Confirmation links to BscScan Testnet and hands the same wallet to the
  signature-protected dashboard. Funding proves escrow funding only—not useful
  delivery or completion.

## Real category representatives

Record only candidates that pass the command above and a manual `/negotiate`
through Sift. One real agent may cover multiple categories only when its indexed
source evidence declares or deterministically supports each category.

| Required category | Chain-97 agent ID | Studio identity evidence | Live status + quote | Activation outcome |
| --- | --- | --- | --- | --- |
| Yield Optimisation | `2153`, `2147`, `2140` sampled | Not recorded | All three returned an invalid ERC-8183 status document | BLOCKED |
| Grid Trading | `2148`, `2146`, `2132` sampled | Not recorded | All three returned an invalid ERC-8183 status document | BLOCKED |
| Health Factor Monitoring | None returned by bounded readiness search | Not recorded | Not available | BLOCKED |
| Liquidity Rebalancing | None returned by bounded readiness search | Not recorded | Not available | BLOCKED |

This bounded observation was made on 2026-09-05 with
`npm run verify:activation`. The live official-SDK-aligned chain-97 deployment
check passed. The search samples at most three recent text-matching candidates
per category; it is an honest readiness probe, not a claim that no other agent
can ever exist. Re-run it immediately before selecting demo evidence because
third-party metadata and endpoints can change.

Do not turn a syntactically valid declaration into a compatibility claim. The
endpoint, owner, deployment, token, and provider signature must pass at the time
of the evidence run.

## Human-approved testnet evidence

Use a new disposable wallet holding no valuable mainnet assets. Configure BSC
Testnet chain ID `97`, obtain only test funds from the
[official BNB Chain faucet](https://www.bnbchain.org/en/testnet-faucet), and use
[BscScan Testnet](https://testnet.bscscan.com/) for independent receipt checks.
For a non-zero quote, use the U-token faucet linked in `docs/hiring.md` and
confirm the token address before approving it. Never paste a seed phrase or
private key into Sift, a terminal, documentation, issue, or screenshot.

| Evidence | Recorded value |
| --- | --- |
| Indexed chain-97 agent ID and owner | Not recorded |
| Studio project/CLI resolution date | Not recorded |
| Signed quote observation time and amount | Not recorded |
| Disposable public wallet address | Not recorded |
| `createJob` transaction and job ID | Not recorded |
| `registerJob` transaction | Not recorded |
| `setBudget` transaction | Not recorded |
| Exact approval transaction, if required | Not recorded |
| Funding transaction | Not recorded |
| Dashboard recovery time | Not recorded |
| Second-wallet isolation result | Not recorded |

The tester must separately exercise wallet rejection, wrong network, account
change, stale quote, pending reload, confirmed reload, and repeated-click
prevention. Record the production commit and UTC timestamps. M15 becomes PASS
only after every required category has an honest outcome and the full job,
dashboard recovery, explorer receipt, and two-wallet isolation are verified.
