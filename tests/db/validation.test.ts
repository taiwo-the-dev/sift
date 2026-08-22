import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  validateAgentHealthWrite,
  validateAgentScoreWrite,
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
    metadataVerifiedAt: null,
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

  it("maps a successful metadata verification timestamp explicitly", () => {
    const verifiedAt = "2026-08-22T10:30:00.000Z";
    const record = validateAgentWrite(
      createAgentInput({ metadataVerifiedAt: verifiedAt }),
    );

    assert.equal(record.metadata_verified_at, verifiedAt);
  });

  it("validates bounded M6 health evidence without fabricating success", () => {
    const record = validateAgentHealthWrite({
      agentDbId: "11111111-1111-4111-8111-111111111111",
      checkCount: 3,
      checkedEndpoint: "https://agent.test-only.dev/health",
      endpointHash: "a".repeat(64),
      failureCount: 1,
      lastCheckedAt: "2026-08-22T12:00:00.000Z",
      lastSuccessAt: "2026-08-22T11:00:00.000Z",
      outcome: "timeout",
      responseTimeMs: null,
      serviceType: "health",
      status: "offline",
      successCount: 2,
    });

    assert.equal(record.outcome, "timeout");
    assert.equal(record.success_count, 2);
    assert.throws(() =>
      validateAgentHealthWrite({
        agentDbId: "11111111-1111-4111-8111-111111111111",
        checkCount: 3,
        checkedEndpoint: "http://unsafe.test-only.dev/health",
        endpointHash: "a".repeat(64),
        failureCount: 0,
        lastCheckedAt: "2026-08-22T12:00:00.000Z",
        lastSuccessAt: null,
        outcome: "success",
        responseTimeMs: 1,
        serviceType: "health",
        status: "online",
        successCount: 4,
      }),
    );
  });

  it("persists an auditable withheld M6 score as null", () => {
    const record = validateAgentScoreWrite({
      agentDbId: "11111111-1111-4111-8111-111111111111",
      assessment: {
        components: {
          availability: null,
          capability: 55,
          metadata: 85,
          reliability: null,
          reputation: null,
          trackRecord: null,
        },
        confidence: 0.2,
        evidenceSnapshot: { evidenceWeight: 20 },
        limitations: ["Test-only fixture has insufficient evidence."],
        score: null,
        sourceFreshness: {
          healthAt: null,
          metadataAt: "2026-08-22T12:00:00.000Z",
          reputationAt: null,
        },
        version: "sift-evidence-v1.0.0",
      },
      calculatedAt: "2026-08-22T12:00:00.000Z",
    });

    assert.equal(record.sift_score, null);
    assert.equal(record.score_version, "sift-evidence-v1.0.0");
    assert.deepEqual(record.source_freshness, {
      healthAt: null,
      metadataAt: "2026-08-22T12:00:00.000Z",
      reputationAt: null,
    });
  });
});
