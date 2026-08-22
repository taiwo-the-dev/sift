import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateAgentWrite,
  validateSyncCheckpoint,
  type AgentWriteInput,
} from "../../lib/db/validation";

const registryAddress = "0x1111111111111111111111111111111111111111";

function createAgentInput(
  overrides: Partial<AgentWriteInput> = {},
): AgentWriteInput {
  return {
    active: null,
    agentId: "340282366920938463463374607431768211455",
    agentUri: null,
    category: null,
    chainId: 97,
    description: null,
    imageUrl: null,
    lastSyncedAt: null,
    metadataStatus: "pending",
    name: null,
    ownerAddress: null,
    registeredAt: null,
    registeredBlock: null,
    registryAddress,
    x402Supported: null,
    ...overrides,
  };
}

describe("database input validation", () => {
  it("preserves a uint256-compatible agent identifier as a string", () => {
    const record = validateAgentWrite(createAgentInput());

    assert.equal(
      record.agent_id,
      "340282366920938463463374607431768211455",
    );
    assert.equal(record.active, null);
    assert.equal(record.name, null);
  });

  it("canonicalizes valid EVM addresses for stable uniqueness", () => {
    const record = validateAgentWrite(
      createAgentInput({
        ownerAddress: "0xABCDEFabcdefABCDEFabcdefABCDEFabcdefABCD",
      }),
    );

    assert.equal(
      record.owner_address,
      "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    );
  });

  it("rejects unsafe numeric identities and malformed addresses", () => {
    assert.throws(() =>
      validateAgentWrite(createAgentInput({ chainId: Number.MAX_VALUE })),
    );
    assert.throws(() =>
      validateAgentWrite(createAgentInput({ agentId: "001" })),
    );
    assert.throws(() =>
      validateAgentWrite(createAgentInput({ registryAddress: "not-an-address" })),
    );
  });

  it("maps a real checkpoint shape without inventing fields", () => {
    assert.deepEqual(
      validateSyncCheckpoint({
        chainId: 56,
        lastSyncedBlock: 0,
        registryAddress,
      }),
      {
        chain_id: 56,
        last_synced_block: 0,
        registry_address: registryAddress,
      },
    );
  });

  it("accepts a bounded embedded ERC-8004 registration URI", () => {
    const embeddedUri = `data:application/json;base64,${"a".repeat(3_000)}`;
    const record = validateAgentWrite(
      createAgentInput({ agentUri: embeddedUri }),
    );

    assert.equal(record.agent_uri, embeddedUri);
  });
});
