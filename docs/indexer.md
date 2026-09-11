# Sift Indexer operations

The Sift Indexer is a read-only Node.js service that builds Sift's catalogue from ERC-8004 Identity Registry events on BNB Smart Chain. It reads chain data with viem, validates remote registration files, and persists normalized identities and services through the server-only M2 repositories. It does not use a wallet, signing key, paid explorer, or fabricated fallback data.

## Verified deployments

The registry addresses and ABI were rechecked on 2026-08-25 against the canonical [ERC-8004 contracts repository](https://github.com/erc-8004/erc-8004-contracts), the [ERC-8004 specification](https://eips.ethereum.org/EIPS/eip-8004), the official [BNB Agent SDK repository](https://github.com/bnb-chain/bnbagent-sdk), and the official [BNB Agent SDK network guide](https://docs.bnbchain.org/developer-kit/bnbagent-sdk/networks/). BNB's [wallet configuration](https://docs.bnbchain.org/bnb-smart-chain/developers/wallet-configuration/) confirms chain IDs and BscScan origins.

| Network | Chain ID | Identity Registry | Deployment block | Deployment verification |
| --- | ---: | --- | ---: | --- |
| BSC Mainnet | 56 | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` | `79,027,268` | First bytecode block, hash `0xdb9c6a8fff62cc59b2e2d9978af06db139a41e65f30d99ea6f12dc58909d5a36`, 2026-02-03 08:35:15 UTC |
| BSC Testnet | 97 | `0x8004A818BFB912233c491871b3d84c89A494BD9e` | `84,555,147` | Verified ERC-8004 Testnet deployment boundary |

The mainnet deployment boundary was reverified on 2026-08-25 by reading historical bytecode: block `79,027,268` contains registry code and block `79,027,267` does not. The first block also returns canonical registry logs. The minimal checked-in ABI matches the official SDK ABI for `Registered`, `URIUpdated`, `Transfer`, `ownerOf`, and `tokenURI`. Runtime log requests filter to those three relevant events; an explorer is not part of the data path.

## Configuration

Copy `.env.example` to `.env.local`. The existing hosted Supabase variables are required for bootstrap and incremental writes. `npm run index:smoke` needs only RPC configuration.

```env
SUPABASE_URL=<hosted-project-url>
SUPABASE_SECRET_KEY=<server-secret-key>

BNB_NETWORK=bsc-mainnet
BNB_RPC_PRIMARY=
BNB_RPC_FALLBACK_1=
BNB_RPC_FALLBACK_2=
```

Mainnet is the default. Set `BNB_NETWORK=bsc-testnet` for a separate Testnet
run. If no RPC overrides are present, Sift uses three ordered public endpoints
for the selected network. Public providers change limits and availability
without notice; sustained historical indexing may require a free-tier endpoint
that supports historical `eth_getLogs`.

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

Never commit a token-bearing RPC URL. Put it in `.env.local`, deployment secrets, or GitHub Actions secrets. Logs identify providers by order and redact URL queries and common credential patterns. A recent-block smoke test can use the checked-in free public fallbacks, but the historical mainnet bootstrap cannot be considered available until an archive-capable free-tier endpoint has been supplied and verified.

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

Bootstrap and incremental commands both resume from `sync_state` when a checkpoint exists. A range checkpoint is written only after every event in that range has been persisted successfully. Each network row also records the confirmed head observed at run start, so operators and the UI can distinguish a partial bootstrap from a caught-up checkpoint. Interrupting the process is safe after a `block_range_processed` log: the next run starts at the following block. Interrupting during a range replays that range, and deterministic database identities prevent duplicate agents or services.

Every newly observed registration persists its source transaction hash and log index with the existing chain, registry, block, and observation time. Older pre-M13 rows retain `null` rather than receiving guessed provenance; a controlled source-backed replay may populate them later.

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

`.github/workflows/sync-agents.yml` runs independent BSC Mainnet and BSC
Testnet incremental jobs every two hours and can also be dispatched manually.
Configure these GitHub repository secrets:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `BNB_MAINNET_RPC_PRIMARY` with an archive-capable free-tier endpoint
- optional `BNB_MAINNET_RPC_FALLBACK_1` and `BNB_MAINNET_RPC_FALLBACK_2`
- optional `BNB_TESTNET_RPC_PRIMARY`, `BNB_TESTNET_RPC_FALLBACK_1`, and
  `BNB_TESTNET_RPC_FALLBACK_2`; public Testnet fallbacks are used when omitted
- legacy generic `BNB_RPC_PRIMARY` / fallback secrets only as a shared fallback

The workflow matrix fixes each job to one network, serializes runs per network,
uses read-only repository permissions, and has no blockchain signing material.

Generate a read-only network eligibility snapshot from the hosted database:

```bash
npm run report:catalogue
```

The JSON report includes observed time and separate Mainnet/Testnet counts,
registries, latest agent syncs, checkpoints, confirmed heads, partial/stale
states, and the configured hiring policy. It does not expose agent metadata or
credentials.

## BNB Agent Studio identity mapping

The official BNB Agent SDK registration format identifies the registry as `eip155:<chainId>:<identityRegistry>` and publishes the resulting on-chain agent ID. Sift maps that pair directly to `(chain_id, registry_address, agent_id)`; it never collapses the same numeric ID across networks. Agent Studio service declarations remain untrusted registration metadata and are normalized into `agent_services`. An `ERC-8183` service declaration is recognized by the existing compatibility parser, but M13 does not claim activation success; the controlled live Agent Studio/activation proof belongs to M15.

## Recovery

- RPC range failure: rerun the command; the failed range was not checkpointed.
- Pruned-history failure: configure an archive-capable mainnet RPC in
  `BNB_MAINNET_RPC_PRIMARY` for a prolonged catch-up.
- Testnet RPC failure: configure `BNB_TESTNET_RPC_PRIMARY` or let the next
  scheduled run retry from the last saved chain-97 checkpoint.
- Metadata failure: correct the upstream registration file or wait for it to recover. A later URI event or controlled historical replay can refresh it without erasing known-good metadata.
- Database failure: restore Supabase connectivity and rerun; the last fully processed checkpoint is authoritative.
- Suspected deployment/config error: stop, verify the address and start block against the canonical sources and chain bytecode, then use explicit overrides. Never guess a registry address or skip a failed range.

Structured output always includes chain, registry, ranges, affected agents, metadata failures, fallback use, and the final checkpoint. A non-zero process exit means the requested operation did not complete.
