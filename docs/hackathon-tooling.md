# Smart Money Era tooling decision

Decision date: 2026-08-25

## Decision

Sift will make meaningful, verifiable use of the official BNB Chain main-track
resources even where the event does not make a specific tool mandatory. The
tools must strengthen the product rather than become superficial dependencies.

The controlling resource list is the [Smart Money Era Resources
tab](https://www.bnbchain.org/en/hackathons/smart-money-era?tab=resources).

## Required tooling

### BNB Agent Studio CLI and TypeScript SDK

Use the current official CLI/SDK during M15 to validate Sift against a genuine
Agent Studio agent and its ERC-8004 identity and ERC-8183 task interface.

- Resolve exact package names, versions, commands, and authentication from the
  current official documentation when M15 starts; do not guess them in advance.
- Record the CLI/SDK version and the agent's chain, registry identity, service
  declaration, and activation evidence.
- Prefer an existing persistent Agent Studio agent. Creating or externally
  deploying a disposable validation agent requires explicit confirmation of the
  account, cost, lifetime, and cleanup implications.
- Keep CLI scaffolding and agent runtime code out of the Next.js production
  bundle unless an official marketplace-consumer SDK is genuinely required.
- Do not convert Sift into an agent-building product. Agent Studio is used to
  prove marketplace compatibility.

### 8004scan Developer API

Use the hackathon Pro API during M14 for server-side enrichment and independent
validation of selected agent identity, capability, ownership, reputation,
feedback, and network evidence.

- Sift's own ERC-8004 index remains the authoritative core catalogue.
- 8004scan data must be source-labelled, timestamped, cached, rate-limited, and
  represented as unavailable when the API is down.
- The integration must never silently overwrite conflicting onchain facts.
- The API key must be server-only and absent from git, client bundles, logs,
  screenshots, and documentation values.
- The user must create the Developer API key and complete the hackathon Pro-tier
  upgrade form. M14 is blocked from final external validation until access is
  available, although core discovery must continue to work without it.

### Official BSC network resources

Use official BNB Chain documentation for supported chain IDs, RPC configuration,
explorer URLs, and network behavior.

- The owner selected BSC Mainnet chain ID `56` for the release path. Automated
  evidence checks remain read-only.
- Any mainnet wallet validation uses a disposable wallet and only the minimum
  real funds the owner explicitly accepts risking.
- Preparing or simulating an action is not a successful transaction. Only a
  human-approved receipt verified on BscScan can be recorded as execution.
- Sift never requests a seed phrase or private key.

## Partner tooling boundary

Altana, TermiX, and PancakeSwap resources belong to separately judged partner
tracks. They are not included merely because they appear on the Resources tab:

- Altana changes wallet authority, session-key, revocation, and transaction
  security architecture.
- TermiX does not require a product integration; its bounty requires a real
  Agent Advantage Report.
- PancakeSwap requires a real benefit delivered to traders or liquidity
  providers, not a decorative API or logo integration.

M20 is the separately approved Altana integration. It pins the official SDK,
uses browser passkeys, registers bounded sessions in KeyStore, exposes
revocation, and routes a compatible ERC-8183 hire through that session. Its
human mainnet safety evidence remains pending. TermiX is represented only by
the empty real-evidence worksheet in `agent-advantage-report.md`; no result is
claimed.
PancakeSwap remains unimplemented.

Any additional partner feature still requires a separate approved ticket with
its own data, security, transaction, testing, and stop conditions.

## Evidence of meaningful use

The tooling decision is satisfied only when the final release records:

- the official Agent Studio CLI/SDK version and a real compatibility/activation
  result;
- the 8004scan API integration, provenance, fallback, and observed enrichment
  result;
- the official BSC Mainnet network/explorer configuration and any real receipt
  that the owner intentionally approves;
- secrets review and release validation for each integration.

Installing a package, adding a logo, or mentioning a tool in the README is not
meaningful use.
