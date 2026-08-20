# TICKET-003 — M3 BNB / ERC-8004 Indexer

## Status

Ready

## Depends On

M2 — Database Foundation

## Objective

Build the Sift Indexer: an independent, resumable TypeScript service that reads verified ERC-8004 agent registrations from BNB Chain, resolves and validates agent metadata, normalizes it, and persists it through the M2 data layer.

## Product Context

Sift's core value depends on a trustworthy agent catalogue that remains available even if an external explorer fails. This milestone turns BNB Chain registry events and remote metadata into Sift's durable source of truth. It enables later discovery screens without making 8004scan or another third party a critical dependency.

## Scope

- Verify the current official ERC-8004 registry deployment(s), ABI, supported events, deployment blocks, and chain IDs from authoritative sources before implementation.
- Add BNB Smart Chain RPC configuration for a primary endpoint and at least two optional fallbacks.
- Implement a viem-based registry client with typed event decoding.
- Implement historical synchronization from a configured deployment block or explicit safe start block.
- Implement incremental synchronization from a persisted `last_synced_block` checkpoint.
- Read events in bounded block ranges and adapt safely to provider limits.
- Apply an explicit confirmation/finality buffer so the indexer does not treat unstable head blocks as final.
- Make event persistence idempotent and safe to retry.
- Resolve agent identifiers, ownership, URI, registration block/time, and supported on-chain fields.
- Fetch remote agent metadata with timeout, maximum response size, bounded retries, JSON/schema validation, URL validation, and safe error handling.
- Normalize metadata and services into the M2 schema.
- Preserve last-known-good metadata when a later refresh fails.
- Record metadata status, last synchronization time, and failure context without fabricating replacements.
- Update agent records when supported registry events or metadata changes are observed.
- Implement structured, sanitized logging for progress, RPC fallback, metadata failures, and summaries.
- Add CLI commands such as `npm run index:agents` for historical/bootstrap sync and `npm run sync:agents` for incremental sync.
- Document configuration, verified contracts, operating procedure, and recovery/resume behavior.

## Out of Scope

- Discover marketplace UI, search, filters, agent cards, or pagination.
- Agent profile pages.
- Endpoint health checks, reputation derivation, or Sift Score calculation.
- Comparison, wallet, hiring, job, or dashboard functionality.
- Authentication.
- Reliance on 8004scan as the primary catalogue source.
- Full-chain rescans on every run.
- Dedicated nodes, paid RPC requirements, queues, microservices, or continuous high-frequency polling.

## Technical Requirements

- Use Node.js, TypeScript, and viem.
- Use the M2 repositories/services for persistence; do not duplicate direct database logic across scripts.
- Support configuration names equivalent to `BNB_RPC_PRIMARY`, `BNB_RPC_FALLBACK_1`, and `BNB_RPC_FALLBACK_2`.
- Use viem fallback transports or an explicit ordered fallback strategy with observable failures.
- Keep registry addresses, deployment blocks, chain IDs, batch sizes, confirmation depth, timeouts, and response limits configurable and validated.
- Store one checkpoint per chain and registry deployment.
- Advance checkpoints only after the corresponding event range has been processed safely.
- Prefer deterministic upserts keyed by chain, registry, and agent identity.
- Bound RPC concurrency and metadata concurrency to respect public/free endpoints.
- Parse external metadata through a schema validator and normalize unknown fields safely.
- Cache or retain last-known-good metadata in PostgreSQL.
- Produce machine-readable logs without adding an unnecessary paid logging service.
- Keep the indexer runnable locally and from GitHub Actions or another free scheduled environment later.
- Do not use a paid LLM for metadata classification. If category classification is added, use deterministic mappings and keep it independently testable.

## Data Integrity Requirements

- Never fabricate registry events, agents, owners, timestamps, metadata, capabilities, reputation, health, activity, or transaction data.
- Persist source chain ID, registry address, block number, agent ID, and URI exactly enough to audit provenance.
- Treat missing, invalid, or unreachable metadata as an explicit status; do not fill fields with plausible content.
- Preserve last-known-good metadata while recording that the latest verification failed.
- Do not mark an agent verified solely because metadata was reachable.
- Do not silently skip failed ranges while advancing the checkpoint.
- Ensure replaying the same range does not duplicate agents or services.

## Security Requirements

- Never commit RPC keys, database secrets, private keys, or wallet material.
- The indexer must be read-only with respect to BNB Chain and must not require a signing key.
- Restrict metadata URLs to supported HTTP(S) behavior and protect server-side fetches from localhost/private-network SSRF.
- Enforce redirects, content type, response size, and timeout limits.
- Sanitize logged URLs and error payloads where they may contain secrets or excessive remote content.
- Validate registry addresses and all environment configuration before a run starts.

## UX Requirements

- No new production-facing UI is required.
- Operator output must clearly state the chain, registry, scanned range, created/updated counts, metadata failures, fallback use, and final checkpoint.
- Failures should be actionable and should not produce false success summaries.

## Acceptance Criteria

- [ ] Official registry configuration and provenance are documented.
- [ ] Primary and fallback RPC endpoints are supported and tested.
- [ ] Historical sync reads ERC-8004 events in bounded ranges.
- [ ] Incremental sync resumes from the stored checkpoint and reads only new confirmed ranges.
- [ ] Replaying a processed range is idempotent.
- [ ] Valid agent identity and metadata are normalized into PostgreSQL through M2 repositories.
- [ ] Invalid/unreachable metadata is recorded honestly and does not crash the whole run.
- [ ] Last-known-good metadata is retained when refresh fails.
- [ ] Checkpoints are not advanced past unprocessed failures.
- [ ] CLI commands for bootstrap and incremental sync are documented and operational.
- [ ] Logs are structured, useful, and free of secrets.
- [ ] No external explorer is a required dependency.
- [ ] Lint, typecheck, unit/integration tests, and production build pass.

## Testing Requirements

- Unit-test event decoding, normalization, metadata validation, category mapping if present, block-range calculation, and checkpoint decisions.
- Unit-test metadata timeout, size, redirect, invalid JSON, invalid schema, and last-known-good behavior.
- Integration-test database upsert/idempotency and checkpoint persistence.
- Test RPC fallback with controlled failing/succeeding transports.
- Test a small verified BSC Testnet range or deterministic recorded event fixture; label fixtures clearly and do not present them as live application data.
- Browser testing is not required because this milestone adds no user-facing flow.
- Run `npm run lint`, typecheck, relevant tests, the indexer smoke test, and `npm run build`.

## Definition of Done

M3 is complete when Sift can bootstrap and incrementally maintain a real ERC-8004 catalogue from verified BNB Chain registry deployments, safely resume from checkpoints, tolerate RPC/metadata failures without inventing data, persist normalized records through M2, and expose documented CLI operations without implementing M4 UI.

## Codex Completion Report

Codex must report:

- Status: PASS or BLOCKED
- Implemented
- Files Changed
- Tests / Validation
- Important Decisions
- Known Issues
- Not Implemented
- Recommended Next Step

## Stop Condition

Do not implement the next milestone automatically.
