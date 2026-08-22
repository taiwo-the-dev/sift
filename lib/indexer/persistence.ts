import "server-only";

import {
  createAgentRepository,
  type AgentRecord,
  type AgentRepository,
} from "@/lib/db/agent-repository";
import {
  createAgentServiceRepository,
  type AgentServiceRepository,
} from "@/lib/db/agent-service-repository";
import {
  createSyncStateRepository,
  type SyncStateRepository,
} from "@/lib/db/sync-state-repository";
import {
  agentCategories,
  type AgentCategory,
  type AgentWriteInput,
} from "@/lib/db/validation";
import type { MetadataFetchResult } from "@/lib/indexer/metadata/fetch";

export type ObservedAgent = Readonly<{
  agentId: bigint;
  agentUri: string;
  chainId: number;
  metadata: MetadataFetchResult;
  observedAt: string;
  ownerAddress: string | null;
  registeredAt: string | null;
  registeredBlock: bigint | null;
  registryAddress: string;
}>;

export type PersistedAgentResult = Readonly<{
  created: boolean;
  record: AgentRecord;
}>;

export type CatalogPersistence = Readonly<{
  findAgent(identity: Readonly<{
    agentId: bigint;
    chainId: number;
    registryAddress: string;
  }>): Promise<AgentRecord | null>;
  getCheckpoint(chainId: number, registryAddress: string): Promise<bigint | null>;
  persistAgent(
    observation: ObservedAgent,
    existing: AgentRecord | null,
  ): Promise<PersistedAgentResult>;
  saveCheckpoint(
    chainId: number,
    registryAddress: string,
    blockNumber: bigint,
  ): Promise<void>;
}>;

function safeBlockNumber(value: bigint): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError("Block number cannot be stored safely.");
  }

  return Number(value);
}

function existingCategory(value: string | null): AgentCategory | null {
  return agentCategories.find((category) => category === value) ?? null;
}

export function buildAgentWriteInput(
  observation: ObservedAgent,
  existing: AgentRecord | null,
): AgentWriteInput {
  const identity = {
    agentId: observation.agentId.toString(),
    agentUri: observation.agentUri || null,
    category: existingCategory(existing?.category ?? null),
    chainId: observation.chainId,
    lastSyncedAt: observation.observedAt,
    ownerAddress: observation.ownerAddress,
    registeredAt: observation.registeredAt ?? existing?.registered_at ?? null,
    registeredBlock:
      observation.registeredBlock === null
        ? existing?.registered_block ?? null
        : safeBlockNumber(observation.registeredBlock),
    registryAddress: observation.registryAddress,
  } as const;

  if (observation.metadata.status === "valid") {
    return {
      ...identity,
      active: observation.metadata.metadata.active,
      description: observation.metadata.metadata.description,
      imageUrl: observation.metadata.metadata.imageUrl,
      metadataStatus: "valid",
      name: observation.metadata.metadata.name,
      x402Supported: observation.metadata.metadata.x402Supported,
    };
  }

  // A failed refresh updates the chain identity and explicit failure status,
  // but does not erase metadata from the most recent successful verification.
  return {
    ...identity,
    active: existing?.active ?? null,
    description: existing?.description ?? null,
    imageUrl: existing?.image_url ?? null,
    metadataStatus: observation.metadata.status,
    name: existing?.name ?? null,
    x402Supported: existing?.x402_supported ?? null,
  };
}

export function createCatalogPersistence(
  repositories: Readonly<{
    agents?: AgentRepository;
    services?: AgentServiceRepository;
    syncState?: SyncStateRepository;
  }> = {},
): CatalogPersistence {
  const agents = repositories.agents ?? createAgentRepository();
  const services = repositories.services ?? createAgentServiceRepository();
  const syncState = repositories.syncState ?? createSyncStateRepository();

  return {
    findAgent(identity) {
      return agents.findByIdentity({
        agentId: identity.agentId.toString(),
        chainId: identity.chainId,
        registryAddress: identity.registryAddress,
      });
    },
    async getCheckpoint(chainId, registryAddress) {
      const checkpoint = await syncState.find({ chainId, registryAddress });
      return checkpoint ? BigInt(checkpoint.last_synced_block) : null;
    },
    async persistAgent(observation, existing) {
      const record = await agents.upsert(
        buildAgentWriteInput(observation, existing),
      );

      if (observation.metadata.status === "valid") {
        await services.replaceForAgent(
          record.id,
          observation.metadata.metadata.services,
        );
      }

      return { created: existing === null, record };
    },
    async saveCheckpoint(chainId, registryAddress, blockNumber) {
      await syncState.upsert({
        chainId,
        lastSyncedBlock: safeBlockNumber(blockNumber),
        registryAddress,
      });
    },
  };
}
