import type { IndexerConfig } from "@/lib/indexer/config";
import type { Logger } from "@/lib/indexer/logger";
import type { MetadataClient, MetadataFetchResult } from "@/lib/indexer/metadata/fetch";
import type {
  CatalogPersistence,
  ObservedAgent,
} from "@/lib/indexer/persistence";
import {
  calculateConfirmedHead,
  nextBlockRange,
  reduceBatchSize,
} from "@/lib/indexer/ranges";
import { decodeRegistryLogs, type RegisteredEvent, type RegistryEvent } from "@/lib/indexer/registry-events";
import type { RegistryRpcPool } from "@/lib/indexer/rpc";

export type IndexerMode = "bootstrap" | "incremental";

export type IndexerSummary = Readonly<{
  checkpoint: bigint | null;
  created: number;
  fromBlock: bigint | null;
  metadataFailures: number;
  ranges: number;
  registryEvents: number;
  toBlock: bigint | null;
  updated: number;
}>;

type AgentChange = Readonly<{
  agentId: bigint;
  agentUri: string | undefined;
  ownerAddress: string | null | undefined;
  registration: RegisteredEvent | null;
}>;

export type IndexerDependencies = Readonly<{
  clock?: () => Date;
  logger: Logger;
  metadata: MetadataClient;
  persistence: CatalogPersistence;
  rpc: RegistryRpcPool;
}>;

function changesFromEvents(events: readonly RegistryEvent[]): AgentChange[] {
  const changes = new Map<string, AgentChange>();

  for (const event of events) {
    const key = event.agentId.toString();
    const current = changes.get(key);
    changes.set(key, {
      agentId: event.agentId,
      agentUri:
        event.kind === "registered"
          ? event.agentUri
          : event.kind === "uri-updated"
            ? event.newUri
            : current?.agentUri,
      ownerAddress:
        event.kind === "registered"
          ? event.owner
          : event.kind === "transfer"
            ? event.to === "0x0000000000000000000000000000000000000000"
              ? null
              : event.to
            : current?.ownerAddress,
      registration:
        event.kind === "registered"
          ? event
          : current?.registration ?? null,
    });
  }

  return [...changes.values()];
}

export function resolveStartBlock(
  deploymentBlock: bigint,
  checkpoint: bigint | null,
): bigint {
  if (deploymentBlock < 0n || (checkpoint !== null && checkpoint < 0n)) {
    throw new RangeError("Deployment and checkpoint blocks must be non-negative.");
  }

  return checkpoint === null || checkpoint < deploymentBlock
    ? deploymentBlock
    : checkpoint + 1n;
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  callback: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await callback(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, worker),
  );
  return results;
}

function timestampToIso(timestamp: bigint): string {
  const milliseconds = timestamp * 1_000n;

  if (milliseconds > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Block timestamp exceeds the supported date range.");
  }

  return new Date(Number(milliseconds)).toISOString();
}

async function observeAndPersistAgent(
  change: AgentChange,
  rangeEnd: bigint,
  observedAt: string,
  config: IndexerConfig,
  dependencies: IndexerDependencies,
): Promise<Readonly<{ created: boolean; metadata: MetadataFetchResult }>> {
  const existing = await dependencies.persistence.findAgent({
    agentId: change.agentId,
    chainId: config.chainId,
    registryAddress: config.registryAddress,
  });
  const ownerAddress =
    change.ownerAddress !== undefined
      ? change.ownerAddress
      : existing !== null
        ? existing.owner_address
        : await dependencies.rpc.ownerOf(
            config.registryAddress,
            change.agentId,
            rangeEnd,
          );
  const agentUri =
    change.agentUri !== undefined
      ? change.agentUri
      : existing !== null
        ? existing.agent_uri ?? ""
        : await dependencies.rpc.tokenUri(
            config.registryAddress,
            change.agentId,
            rangeEnd,
          );
  const metadata = await dependencies.metadata.fetch(agentUri);
  const registeredAt = change.registration
    ? timestampToIso(
        await dependencies.rpc.getBlockTimestamp(
          change.registration.blockNumber,
        ),
      )
    : null;
  const observation: ObservedAgent = {
    agentId: change.agentId,
    agentUri,
    chainId: config.chainId,
    metadata,
    observedAt,
    ownerAddress,
    registeredAt,
    registeredBlock: change.registration?.blockNumber ?? null,
    registryAddress: config.registryAddress,
  };
  const persisted = await dependencies.persistence.persistAgent(
    observation,
    existing,
  );

  if (metadata.status !== "valid") {
    dependencies.logger.warn("agent_metadata_failed", {
      agentId: change.agentId.toString(),
      code: metadata.code,
      metadataStatus: metadata.status,
    });
  }

  return { created: persisted.created, metadata };
}

export async function runIndexer(
  mode: IndexerMode,
  config: IndexerConfig,
  dependencies: IndexerDependencies,
): Promise<IndexerSummary> {
  await dependencies.rpc.validate(config.chainId, config.registryAddress);
  const latestBlock = await dependencies.rpc.getBlockNumber();
  const confirmedHead = calculateConfirmedHead(
    latestBlock,
    config.confirmations,
  );
  const checkpoint = await dependencies.persistence.getCheckpoint(
    config.chainId,
    config.registryAddress,
  );
  const firstBlock = resolveStartBlock(config.deploymentBlock, checkpoint);
  const summary = {
    checkpoint,
    created: 0,
    fromBlock: null as bigint | null,
    metadataFailures: 0,
    ranges: 0,
    registryEvents: 0,
    toBlock: null as bigint | null,
    updated: 0,
  };

  dependencies.logger.info("indexer_started", {
    chainId: config.chainId,
    confirmedHead: confirmedHead?.toString() ?? null,
    deploymentBlock: config.deploymentBlock.toString(),
    mode,
    network: config.network,
    previousCheckpoint: checkpoint?.toString() ?? null,
    registryAddress: config.registryAddress.toLowerCase(),
  });

  if (confirmedHead === null || firstBlock > confirmedHead) {
    dependencies.logger.info("indexer_complete", {
      chainId: config.chainId,
      checkpoint: checkpoint?.toString() ?? null,
      created: 0,
      metadataFailures: 0,
      ranges: 0,
      registryEvents: 0,
      updated: 0,
    });
    return summary;
  }

  let nextBlock = firstBlock;
  let batchSize = config.batchSize;
  let batchGrowthCeiling = config.batchSize;

  while (nextBlock <= confirmedHead) {
    const range = nextBlockRange(nextBlock, confirmedHead, batchSize);

    if (!range) {
      break;
    }

    let rawLogs;

    try {
      rawLogs = await dependencies.rpc.getLogs(
        config.registryAddress,
        range.fromBlock,
        range.toBlock,
      );
    } catch (error) {
      const reduced = reduceBatchSize(batchSize, config.minBatchSize);

      if (reduced === null) {
        throw error;
      }

      dependencies.logger.warn("block_range_reduced", {
        fromBlock: range.fromBlock.toString(),
        newBatchSize: reduced.toString(),
        previousBatchSize: batchSize.toString(),
      });
      batchGrowthCeiling = batchSize - 1n;
      batchSize = reduced;
      continue;
    }

    const events = decodeRegistryLogs(rawLogs);
    const observedAt = (dependencies.clock ?? (() => new Date()))().toISOString();
    const persisted = await mapWithConcurrency(
      changesFromEvents(events),
      config.metadataConcurrency,
      (change) =>
        observeAndPersistAgent(
          change,
          range.toBlock,
          observedAt,
          config,
          dependencies,
        ),
    );

    await dependencies.persistence.saveCheckpoint(
      config.chainId,
      config.registryAddress,
      range.toBlock,
    );

    summary.checkpoint = range.toBlock;
    summary.created += persisted.filter((result) => result.created).length;
    summary.fromBlock ??= range.fromBlock;
    summary.metadataFailures += persisted.filter(
      (result) => result.metadata.status !== "valid",
    ).length;
    summary.ranges += 1;
    summary.registryEvents += events.length;
    summary.toBlock = range.toBlock;
    summary.updated += persisted.filter((result) => !result.created).length;

    dependencies.logger.info("block_range_processed", {
      affectedAgents: persisted.length,
      checkpoint: range.toBlock.toString(),
      fromBlock: range.fromBlock.toString(),
      registryEvents: events.length,
      toBlock: range.toBlock.toString(),
    });

    nextBlock = range.toBlock + 1n;

    if (batchSize < config.batchSize) {
      const candidate =
        batchSize * 2n > config.batchSize
          ? config.batchSize
          : batchSize * 2n;

      if (candidate <= batchGrowthCeiling) {
        batchSize = candidate;
      }
    }
  }

  dependencies.logger.info("indexer_complete", {
    chainId: config.chainId,
    checkpoint: summary.checkpoint?.toString() ?? null,
    created: summary.created,
    metadataFailures: summary.metadataFailures,
    ranges: summary.ranges,
    registryEvents: summary.registryEvents,
    updated: summary.updated,
  });

  return summary;
}

export async function runIndexerSmokeTest(
  config: IndexerConfig,
  dependencies: Pick<IndexerDependencies, "logger" | "rpc">,
): Promise<void> {
  await dependencies.rpc.validate(config.chainId, config.registryAddress);
  const latestBlock = await dependencies.rpc.getBlockNumber();
  const confirmedHead = calculateConfirmedHead(
    latestBlock,
    config.confirmations,
  );

  if (confirmedHead === null) {
    throw new Error("The configured chain does not have a confirmed block yet.");
  }

  const fromBlock =
    confirmedHead > config.deploymentBlock + 99n
      ? confirmedHead - 99n
      : config.deploymentBlock;
  const logs = await dependencies.rpc.getLogs(
    config.registryAddress,
    fromBlock,
    confirmedHead,
  );
  const events = decodeRegistryLogs(logs);

  dependencies.logger.info("indexer_smoke_passed", {
    chainId: config.chainId,
    confirmedHead: confirmedHead.toString(),
    fromBlock: fromBlock.toString(),
    registryEvents: events.length,
    registryHasCode: true,
  });
}
