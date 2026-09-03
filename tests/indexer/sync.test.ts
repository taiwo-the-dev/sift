import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encodeAbiParameters,
  encodeEventTopics,
  type Address,
  type Hex,
} from "viem";

import type { AgentRecord } from "../../lib/db/agent-repository";
import { identityRegistryAbi } from "../../lib/indexer/abi";
import { parseIndexerConfig } from "../../lib/indexer/config";
import { createLogger } from "../../lib/indexer/logger";
import type { MetadataClient } from "../../lib/indexer/metadata/fetch";
import type {
  CatalogPersistence,
  ObservedAgent,
} from "../../lib/indexer/persistence";
import type { RegistryRawLog } from "../../lib/indexer/registry-events";
import {
  RegistryRpcPool,
  type RegistryRpcProvider,
} from "../../lib/indexer/rpc";
import { runIndexer } from "../../lib/indexer/sync";

const owner = "0x1111111111111111111111111111111111111111";
const transactionHash = `0x${"12".repeat(32)}` as Hex;

function registrationLog(): RegistryRawLog {
  return {
    blockNumber: 100n,
    data: encodeAbiParameters(
      [{ type: "string" }],
      ["https://agent.example/metadata.json"],
    ),
    logIndex: 1,
    topics: encodeEventTopics({
      abi: identityRegistryAbi,
      args: { agentId: 7n, owner },
      eventName: "Registered",
    }).flatMap((topic) => (typeof topic === "string" ? [topic] : [])),
    transactionHash,
  };
}

function successfulMetadata(): MetadataClient {
  return {
    fetch: async () => ({
      metadata: {
        active: true,
        description: "Deterministic integration fixture.",
        imageUrl: "https://agent.example/image.png",
        name: "Fixture Agent",
        services: [],
        x402Supported: false,
      },
      status: "valid",
    }),
  };
}

function recordFromObservation(observation: ObservedAgent): AgentRecord {
  const validMetadata =
    observation.metadata.status === "valid"
      ? observation.metadata.metadata
      : null;

  return {
    active: validMetadata?.active ?? null,
    agent_id: observation.agentId.toString(),
    agent_uri: observation.agentUri,
    category: null,
    chain_id: observation.chainId,
    created_at: observation.observedAt,
    description: validMetadata?.description ?? null,
    id: "11111111-1111-4111-8111-111111111111",
    image_url: validMetadata?.imageUrl ?? null,
    last_synced_at: observation.observedAt,
    metadata_verified_at:
      observation.metadata.status === "valid" ? observation.observedAt : null,
    metadata_status: observation.metadata.status,
    name: validMetadata?.name ?? null,
    owner_address: observation.ownerAddress?.toLowerCase() ?? null,
    registered_at: observation.registeredAt,
    registered_block:
      observation.registeredBlock === null
        ? null
        : Number(observation.registeredBlock),
    registration_log_index: observation.registrationLogIndex,
    registration_transaction_hash: observation.registrationTransactionHash,
    registry_address: observation.registryAddress.toLowerCase(),
    updated_at: observation.observedAt,
    x402_supported: validMetadata?.x402Supported ?? null,
  };
}

describe("indexer range integration", () => {
  it("replays a range idempotently and resumes after its checkpoint", async () => {
    const records = new Map<string, AgentRecord>();
    let checkpoint: bigint | null = null;
    let confirmedHead: bigint | null = null;
    let writes = 0;
    const persistence: CatalogPersistence = {
      async findAgent(identity) {
        return records.get(identity.agentId.toString()) ?? null;
      },
      async getCheckpoint() {
        return checkpoint;
      },
      async persistAgent(observation, existing) {
        writes += 1;
        const record = recordFromObservation(observation);
        records.set(observation.agentId.toString(), record);
        return { created: existing === null, record };
      },
      async saveCheckpoint(_chainId, _registryAddress, blockNumber, head) {
        checkpoint = blockNumber;
        confirmedHead = head;
      },
    };
    const provider: RegistryRpcProvider = {
      getBlockNumber: async () => 101n,
      getBlockTimestamp: async () => 1_700_000_000n,
      getBytecode: async () => "0x01",
      getChainId: async () => 97,
      getLogs: async (_address, fromBlock, toBlock) =>
        fromBlock <= 100n && toBlock >= 100n ? [registrationLog()] : [],
      name: "fixture-rpc",
      ownerOf: async () => owner as Address,
      tokenUri: async () => "https://agent.example/metadata.json",
    };
    const logger = createLogger(() => undefined);
    const rpc = new RegistryRpcPool([provider], logger);
    const config = parseIndexerConfig({
      ERC8004_DEPLOYMENT_BLOCK: "100",
      INDEXER_BATCH_SIZE: "1",
      INDEXER_CONFIRMATIONS: "1",
      INDEXER_MIN_BATCH_SIZE: "1",
    });
    const dependencies = {
      clock: () => new Date("2026-08-20T00:00:00.000Z"),
      logger,
      metadata: successfulMetadata(),
      persistence,
      rpc,
    };

    const first = await runIndexer("bootstrap", config, dependencies);
    assert.equal(first.created, 1);
    assert.equal(checkpoint, 100n);
    assert.equal(confirmedHead, 100n);
    assert.equal(records.size, 1);
    assert.equal(
      records.get("7")?.registration_transaction_hash,
      transactionHash,
    );
    assert.equal(records.get("7")?.registration_log_index, 1);

    checkpoint = null;
    const replay = await runIndexer("bootstrap", config, dependencies);
    assert.equal(replay.created, 0);
    assert.equal(replay.updated, 1);
    assert.equal(records.size, 1);
    assert.equal(writes, 2);

    const resumed = await runIndexer("incremental", config, dependencies);
    assert.equal(resumed.ranges, 0);
    assert.equal(writes, 2);
  });

  it("keeps overlapping numeric identities and checkpoints isolated by network", async () => {
    const checkpoints = new Map<number, bigint>();
    const records = new Map<string, AgentRecord>();
    const persistence: CatalogPersistence = {
      async findAgent(identity) {
        return records.get(`${identity.chainId}:${identity.agentId}`) ?? null;
      },
      async getCheckpoint(chainId) {
        return checkpoints.get(chainId) ?? null;
      },
      async persistAgent(observation, existing) {
        const record = recordFromObservation(observation);
        records.set(`${observation.chainId}:${observation.agentId}`, record);
        return { created: existing === null, record };
      },
      async saveCheckpoint(chainId, _registryAddress, blockNumber) {
        checkpoints.set(chainId, blockNumber);
      },
    };
    const logger = createLogger(() => undefined);

    for (const network of ["bsc-mainnet", "bsc-testnet"] as const) {
      const config = parseIndexerConfig({
        BNB_NETWORK: network,
        ERC8004_DEPLOYMENT_BLOCK: "100",
        INDEXER_BATCH_SIZE: "1",
        INDEXER_CONFIRMATIONS: "1",
        INDEXER_MIN_BATCH_SIZE: "1",
      });
      const provider: RegistryRpcProvider = {
        getBlockNumber: async () => 101n,
        getBlockTimestamp: async () => 1_700_000_000n,
        getBytecode: async () => "0x01",
        getChainId: async () => config.chainId,
        getLogs: async () => [registrationLog()],
        name: `${network}-fixture-rpc`,
        ownerOf: async () => owner as Address,
        tokenUri: async () => "https://agent.example/metadata.json",
      };

      await runIndexer("bootstrap", config, {
        logger,
        metadata: successfulMetadata(),
        persistence,
        rpc: new RegistryRpcPool([provider], logger),
      });
    }

    assert.deepEqual([...checkpoints.entries()].sort(), [
      [56, 100n],
      [97, 100n],
    ]);
    assert.deepEqual([...records.keys()].sort(), ["56:7", "97:7"]);
  });

  it("persists an agent and advances the checkpoint when its metadata is invalid", async () => {
    let checkpoint: bigint | null = null;
    let persistedMetadata: ObservedAgent["metadata"] | null = null;
    const persistence: CatalogPersistence = {
      findAgent: async () => null,
      getCheckpoint: async () => null,
      async persistAgent(observation) {
        persistedMetadata = observation.metadata;
        return { created: true, record: recordFromObservation(observation) };
      },
      async saveCheckpoint(_chainId, _registryAddress, blockNumber) {
        checkpoint = blockNumber;
      },
    };
    const provider: RegistryRpcProvider = {
      getBlockNumber: async () => 101n,
      getBlockTimestamp: async () => 1_700_000_000n,
      getBytecode: async () => "0x01",
      getChainId: async () => 97,
      getLogs: async () => [registrationLog()],
      name: "fixture-rpc",
      ownerOf: async () => owner as Address,
      tokenUri: async () => "https://agent.example/metadata.json",
    };
    const logger = createLogger(() => undefined);
    const config = parseIndexerConfig({
      ERC8004_DEPLOYMENT_BLOCK: "100",
      INDEXER_BATCH_SIZE: "1",
      INDEXER_CONFIRMATIONS: "1",
      INDEXER_MIN_BATCH_SIZE: "1",
    });

    const summary = await runIndexer("bootstrap", config, {
      logger,
      metadata: {
        fetch: async () => ({ code: "invalid-schema", status: "invalid" }),
      },
      persistence,
      rpc: new RegistryRpcPool([provider], logger),
    });

    assert.deepEqual(persistedMetadata, {
      code: "invalid-schema",
      status: "invalid",
    });
    assert.equal(checkpoint, 100n);
    assert.equal(summary.created, 1);
    assert.equal(summary.metadataFailures, 1);
    assert.equal(summary.ranges, 1);
  });

  it("does not advance a checkpoint past a failed range", async () => {
    let checkpointWrites = 0;
    const persistence: CatalogPersistence = {
      findAgent: async () => null,
      getCheckpoint: async () => null,
      persistAgent: async () => {
        throw new Error("unexpected");
      },
      saveCheckpoint: async () => {
        checkpointWrites += 1;
      },
    };
    const failingProvider: RegistryRpcProvider = {
      getBlockNumber: async () => 101n,
      getBlockTimestamp: async () => 1_700_000_000n,
      getBytecode: async () => "0x01",
      getChainId: async () => 97,
      getLogs: async () => {
        throw new Error("provider failure");
      },
      name: "failing-rpc",
      ownerOf: async () => owner as Address,
      tokenUri: async () => "",
    };
    const logger = createLogger(() => undefined);
    const config = parseIndexerConfig({
      ERC8004_DEPLOYMENT_BLOCK: "100",
      INDEXER_BATCH_SIZE: "1",
      INDEXER_CONFIRMATIONS: "1",
      INDEXER_MIN_BATCH_SIZE: "1",
    });

    await assert.rejects(() =>
      runIndexer("incremental", config, {
        logger,
        metadata: successfulMetadata(),
        persistence,
        rpc: new RegistryRpcPool([failingProvider], logger),
      }),
    );
    assert.equal(checkpointWrites, 0);
  });
});
