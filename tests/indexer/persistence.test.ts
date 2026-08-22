import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AgentRecord } from "../../lib/db/agent-repository";
import { buildAgentWriteInput, type ObservedAgent } from "../../lib/indexer/persistence";

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
});
