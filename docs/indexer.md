# Sift Indexer operations

The Sift Indexer is a read-only Node.js service that builds Sift's catalogue from ERC-8004 Identity Registry events on BNB Smart Chain. It reads chain data with viem, validates remote registration files, and persists normalized identities and services through the server-only M2 repositories. It does not use a wallet, signing key, paid explorer, or fabricated fallback data.

## Verified deployments

The registry addresses and ABI were checked against the canonical [ERC-8004 contracts repository](https://github.com/erc-8004/erc-8004-contracts), the [ERC-8004 specification](https://eips.ethereum.org/EIPS/eip-8004), and the official [BNB Agent SDK network configuration](https://github.com/bnb-chain/bnbagent-sdk/blob/main/typescript/src/config.ts).

| Network | Chain ID | Identity Registry | Deployment block | Deployment verification |
| --- | ---: | --- | ---: | --- |
| BSC Testnet | 97 | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | `84,555,147` | First bytecode block, hash `0x8090bd6bbf308ad5e5674792b03196427ae3357a2df9e211dcd2f1ec4db20333`, 2026-01-15 10:03:52 UTC |
| BSC Mainnet | 56 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `79,027,268` | First bytecode block, hash `0xdb9c6a8fff62cc59b2e2d9978af06db139a41e65f30d99ea6f12dc58909d5a36`, 2026-02-03 08:35:15 UTC |

The deployment boundaries were verified on 2026-08-20 by reading historical bytecode: the documented block contains registry code and its immediately preceding block does not. The minimal checked-in ABI covers `Registered`, `URIUpdated`, `Transfer`, `ownerOf`, and `tokenURI`. Runtime log requests filter to those three relevant events; an explorer is not part of the data path.

## Configuration

Copy `.env.example` to `.env.local`. The existing hosted Supabase variables are required for bootstrap and incremental writes. `npm run index:smoke` needs only RPC configuration.

```env
SUPABASE_URL=<hosted-project-url>
SUPABASE_SECRET_KEY=<server-secret-key>

BNB_NETWORK=bsc-testnet
BNB_RPC_PRIMARY=
BNB_RPC_FALLBACK_1=
BNB_RPC_FALLBACK_2=
```

Testnet is the safe default. If no RPC overrides are present, Sift uses three ordered public endpoints. Public providers change limits and availability without notice; for sustained mainnet historical indexing, create a free-tier RPC project that supports historical `eth_getLogs` and store its URL in `BNB_RPC_PRIMARY`. BNB's public mainnet endpoints may reject `eth_getLogs`, as documented in the [BNB Chain RPC endpoint guide](https://docs.bnbchain.org/bnb-smart-chain/developers/json_rpc/json-rpc-endpoint/).

All tuning values are optional:

| Variable | Default | Purpose |
| --- | ---: | --- |
| `ERC8004_REGISTRY_ADDRESS` | Verified network address | Explicit reviewed deployment override |
| `ERC8004_DEPLOYMENT_BLOCK` | Verified network block | Explicit safe start override |
| `INDEXER_BATCH_SIZE` | `50000` | Maximum requested block range |
| `INDEXER_MIN_BATCH_SIZE` | `100` | Smallest retry range after provider failures |
| `INDEXER_CONFIRMATIONS` | `15` | Blocks withheld from the unstable chain head |
| `INDEXER_RPC_TIMEOUT_MS` | `12000` | Timeout for each RPC attempt |
| `INDEXER_METADATA_TIMEOUT_MS` | `8000` | End-to-end timeout for each metadata attempt |
| `INDEXER_METADATA_MAX_BYTES` | `512000` | Maximum registration response size |
| `INDEXER_METADATA_RETRIES` | `2` | Retries for transient metadata failures |
| `INDEXER_METADATA_CONCURRENCY` | `4` | Maximum agents processed concurrently |
| `IPFS_GATEWAY_URL` | `https://ipfs.io/ipfs/` | HTTPS gateway for `ipfs://` registration files |

Never commit a token-bearing RPC URL. Put it in `.env.local`, deployment secrets, or GitHub Actions secrets. Logs identify providers by order and redact URL queries and common credential patterns.

## Commands

Verify chain ID, registry bytecode, confirmed head access, fallbacks, and a recent 100-block event query without opening the database:

```bash
npm run index:smoke
```

Bootstrap or resume historical synchronization:

```bash
npm run index:agents
```

Read only ranges after the stored checkpoint:

```bash
npm run sync:agents
```

Bootstrap and incremental commands both resume from `sync_state` when a checkpoint exists. A range checkpoint is written only after every event in that range has been persisted successfully. Interrupting the process is safe after a `block_range_processed` log: the next run starts at the following block. Interrupting during a range replays that range, and deterministic database identities prevent duplicate agents or services.

The indexer halves an oversized range when every configured RPC rejects it. After discovering a provider ceiling it does not repeatedly probe above that ceiling during the same run. On a free public endpoint, initial history can take multiple runs; this is expected and does not require a paid node.

## Metadata behavior

Registration files support public HTTP(S), `ipfs://` through the configured HTTPS gateway, bounded JSON data URIs, and the spec's discouraged but deployed serialized on-chain JSON form. Remote requests use manual redirects, DNS/private-network SSRF checks, response type and size limits, timeouts, and bounded retries.

The validator recognizes the current `services` field and the deployed legacy `endpoints` field. Optional ERC-8004 fields remain `null` when absent. Sift never fills a missing image, description, activity flag, x402 flag, endpoint, or capability with guessed content.

Metadata outcomes are explicit:

- `valid`: recognized ERC-8004 registration metadata was normalized;
- `invalid`: the URI, JSON, or schema is unusable;
- `unavailable`: the remote resource could not currently be reached.

On a failed refresh, the agent's latest on-chain URI and owner are updated, but the last-known-good descriptive metadata and services remain in PostgreSQL. The failure code is emitted in the structured operator log. Reachable metadata is not treated as ownership or endpoint verification.

The M5 provenance migration separates `metadata_verified_at` from `last_synced_at`. Successful validations advance both timestamps; failed refreshes advance only the catalogue sync time and retain the previous successful verification time. Apply `20260822111500_add_metadata_verification_time.sql` before running the matching indexer version.

M6 reads this verification timestamp when deciding whether metadata-derived score components are current. Endpoint health assessment is a separate bounded process documented in [Agent health and Sift Score](scoring.md); the Sift Indexer does not probe declared services during chain synchronization.

## Scheduled operation

`.github/workflows/sync-agents.yml` runs incremental synchronization every two hours and can also be dispatched manually. Configure these GitHub repository secrets:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `BNB_RPC_PRIMARY` when using a token-bearing or dedicated free endpoint
- optional `BNB_RPC_FALLBACK_1` and `BNB_RPC_FALLBACK_2`

Set the optional repository variable `BNB_NETWORK` to `bsc-testnet` or `bsc-mainnet`. The workflow has read-only repository permissions, serializes indexer runs, and has no blockchain signing material.

## Recovery

- RPC range failure: rerun the command; the failed range was not checkpointed.
- Metadata failure: correct the upstream registration file or wait for it to recover. A later URI event or controlled historical replay can refresh it without erasing known-good metadata.
- Database failure: restore Supabase connectivity and rerun; the last fully processed checkpoint is authoritative.
- Suspected deployment/config error: stop, verify the address and start block against the canonical sources and chain bytecode, then use explicit overrides. Never guess a registry address or skip a failed range.

Structured output always includes chain, registry, ranges, affected agents, metadata failures, fallback use, and the final checkpoint. A non-zero process exit means the requested operation did not complete.
