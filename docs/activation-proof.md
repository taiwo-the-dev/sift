# M15 mainnet activation proof

This record separates code readiness from real-world proof. The owner selected
a BSC Mainnet-only release path on 2026-09-10. M15 remains **BLOCKED** until a
genuine Agent Studio project, compatible mainnet category representatives, and
the required human wallet evidence are recorded. Nothing is replaced with a
fixture, screenshot, or invented transaction.

## Official tooling baseline

Sift pins the official tools as development-only dependencies so CLI scaffolding
does not enter the production web bundle:

| Tool | Exact version | Purpose |
| --- | --- | --- |
| `@bnbagent/studio-cli` | `0.0.13` | Read-only Studio project scan and ERC-8004 identity resolution |
| `@bnbagent/sdk` | `0.5.5` | Independent deployment/address compatibility check |

Node.js 22 or newer is required. Run the non-mutating mainnet checks from Sift:

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

`verify:activation` checks BSC Mainnet chain ID `56`. It compares the official
SDK deployment with Sift, resolves real identities through
`bag erc8004 resolve <agent-id> --network bsc-mainnet`, loads indexed category
evidence, and validates the live service document. It does not deploy an agent,
negotiate a paid task, use a private key, or submit a transaction.

## Compatibility and safety contract

A static ERC-8183 pass requires a chain-56 identity, currently valid metadata,
a valid indexed EVM owner, a supported service version, and a safe public HTTPS
endpoint. Before persistence or a wallet request, Sift also binds and revalidates
the owner, signed provider, mission, chain, APEX contracts, payment token,
finite price, quote expiry, connected account, exact allowance, calldata, job,
receipt, events, and confirmations. Any mismatch fails closed.

Other supported task methods keep their own limits:

- A2A sends the exact user-confirmed task to a recently checked service.
- MCP executes only tools that explicitly declare read-only behavior.
- x402 displays a verified quote but does not pay automatically.

## Automated readiness evidence

Recorded on 2026-09-10 against real hosted mainnet data:

| Check | Outcome |
| --- | --- |
| Mainnet catalogue | Current at confirmed head `121126225` |
| Bounded task-service assessment | 100 checked: 3 available, 70 unavailable, 27 unsupported |
| Browser Available path | PASS on desktop and mobile; leads to a current action route |
| Public route/security smoke | PASS |
| Mainnet transaction | Not performed or claimed |

The mainnet Agent Studio/SDK readiness command also ran on 2026-09-10. The
official SDK deployment and live chain-56 runtime matched Sift, and CLI version
`0.0.13` passed. The command remained blocked because no genuine Studio project
path was supplied and none of the 12 sampled category representatives published
the ERC-8183 service required by that protected-hire proof.

The availability count is a bounded observation, not a promise that every
published endpoint works. Re-run immediately before choosing demo evidence.

## Category representatives

Record only candidates that pass `verify:activation` and the corresponding
method-specific request through Sift.

| Required category | Chain-56 agent ID | Studio identity | Live service | Human outcome |
| --- | --- | --- | --- | --- |
| Yield Optimisation | Not recorded | Not recorded | Not recorded | BLOCKED |
| Grid Trading | Not recorded | Not recorded | Not recorded | BLOCKED |
| Health Factor Monitoring | Not recorded | Not recorded | Not recorded | BLOCKED |
| Liquidity Rebalancing | Not recorded | Not recorded | Not recorded | BLOCKED |

One agent may cover multiple categories only when its real source evidence
supports each category. A valid service declaration alone is not proof of a
successful task.

## Human mainnet evidence

Mainnet funds have monetary value. Use a new disposable wallet with only the
minimum amount you explicitly accept risking. Never paste a seed phrase or
private key into Sift, a terminal, documentation, a screenshot, or chat.

| Evidence | Recorded value |
| --- | --- |
| Indexed chain-56 agent ID and owner | Not recorded |
| Studio project/CLI resolution date | Not recorded |
| Service method, observation time, and quoted amount | Not recorded |
| Disposable public wallet address | Not recorded |
| Rejected-request recovery | Not recorded |
| Account-change recovery | Not recorded |
| Mainnet transaction and job ID, if intentionally approved | Not recorded |
| BscScan receipt verification | Not recorded |
| Dashboard recovery | Not recorded |
| Second-wallet isolation | Not recorded |

For a no-spend validation, continue only until the wallet shows the exact
transaction request, then reject it. Confirm Sift records no transaction hash
or successful job. This validates preparation and rejection, not execution.

M15 becomes PASS only after all required category outcomes are source-backed,
the owner-approved wallet checks are recorded, and any claimed execution has a
real BscScan receipt. It is acceptable to keep M15 blocked rather than spend
funds or fabricate proof.
