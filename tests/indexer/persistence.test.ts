import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AgentRecord } from "../../lib/db/agent-repository";
import {
  buildAgentWriteInput,
  createCatalogPersistence,
  type ObservedAgent,
} from "../../lib/indexer/persistence";
import type { CategoryRepository } from "../../lib/db/category-repository";

const existingAgent: AgentRecord = {
  active: true,
  agent_id: "7",
  agent_uri: "https://old.example/metadata.json",
  category: null,
  chain_id: 97,
  created_at: "2026-01-01T00:00:00.000Z",
  description: "Last verified description",
  id: "11111111-1111-4111-8111-111111111111",
  image_url: "https://old.example/image.png",
  last_synced_at: "2026-01-01T00:00:00.000Z",
  metadata_verified_at: "2026-01-01T00:00:00.000Z",
  metadata_status: "valid",
  name: "Last verified name",
  owner_address: "0x1111111111111111111111111111111111111111",
  registered_at: "2026-01-01T00:00:00.000Z",
  registered_block: 100,
  registration_log_index: 3,
  registration_transaction_hash: `0x${"1".repeat(64)}`,
  registry_address: "0x8004a818bfb912233c491871b3d84c89a494bd9e",
  updated_at: "2026-01-01T00:00:00.000Z",
  x402_supported: false,
};

function failedObservation(): ObservedAgent {
  return {
    agentId: 7n,
    agentUri: "https://new.example/metadata.json",
    chainId: 97,
    metadata: { code: "timeout", status: "unavailable" },
    observedAt: "2026-08-20T00:00:00.000Z",
    ownerAddress: "0x2222222222222222222222222222222222222222",
    registeredAt: null,
    registeredBlock: null,
    registrationLogIndex: null,
    registrationTransactionHash: null,
    registryAddress: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  };
}

describe("indexer persistence mapping", () => {
  it("preserves last-known-good metadata after a failed refresh", () => {
    const record = buildAgentWriteInput(failedObservation(), existingAgent);

    assert.equal(record.agentUri, "https://new.example/metadata.json");
    assert.equal(record.ownerAddress, "0x2222222222222222222222222222222222222222");
    assert.equal(record.metadataStatus, "unavailable");
    assert.equal(record.name, "Last verified name");
    assert.equal(record.description, "Last verified description");
    assert.equal(record.registeredBlock, 100);
    assert.equal(record.metadataVerifiedAt, "2026-01-01T00:00:00.000Z");
  });

  it("does not invent metadata for a newly unavailable agent", () => {
    const record = buildAgentWriteInput(failedObservation(), null);

    assert.equal(record.name, null);
    assert.equal(record.description, null);
    assert.equal(record.active, null);
    assert.equal(record.x402Supported, null);
    assert.equal(record.metadataVerifiedAt, null);
  });

  it("persists shared versioned category evidence after valid metadata", async () => {
    let savedCategory = "";
    let savedSource = "";
    const observation: ObservedAgent = {
      ...failedObservation(),
      metadata: {
        metadata: {
          active: true,
          declaredCategories: [],
          description: "Monitors Venus health factor and liquidation risk.",
          imageUrl: null,
          name: "Health Guard",
          services: [],
          x402Supported: false,
        },
        status: "valid",
      },
    };
    const persistence = createCatalogPersistence({
      agents: {
        findByIdentity: async () => existingAgent,
        upsert: async () => existingAgent,
      },
      categories: {
        replaceEvidence: async (
          _agentDbId: string,
          evidence: Parameters<CategoryRepository["replaceEvidence"]>[1],
        ) => {
          savedCategory = evidence[0]?.category ?? "";
          savedSource = evidence[0]?.source ?? "";
        },
      } as unknown as CategoryRepository,
      services: {
        listByAgent: async () => [],
        replaceForAgent: async () => undefined,
      },
      syncState: {
        find: async () => null,
        upsert: async () => ({
          chain_id: 97,
          confirmed_head: 1,
          last_synced_block: 1,
          registry_address: existingAgent.registry_address,
          updated_at: observation.observedAt,
        }),
      },
    });

    await persistence.persistAgent(observation, existingAgent);

    assert.equal(savedCategory, "health-factor-monitoring");
    assert.equal(savedSource, "deterministic-rule");
  });
});
