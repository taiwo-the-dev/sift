import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AgentProfile } from "../../features/agents/model";
import {
  toPublicAgentProfile,
  toPublicAgentScore,
  toPublicAgentTasks,
} from "../../features/public-api/presentation";

const now = new Date().toISOString();

const profile: AgentProfile = {
  active: true,
  agentId: "42",
  agentUri: "https://agent.example/profile.json",
  categories: ["yield-optimisation"],
  categoryEvidence: [],
  categorySource: "declared-metadata",
  chainId: 56,
  description: "Routes liquidity across supported yield opportunities.",
  externalEvidence: null,
  health: {
    checkCount: 4,
    checkedEndpoint: "https://agent.example/health",
    failureCount: 0,
    lastCheckedAt: now,
    lastSuccessAt: now,
    outcome: "success",
    responseTimeMs: 100,
    serviceType: "A2A",
    status: "online",
    successCount: 4,
  },
  imageUrl: null,
  lastSyncedAt: now,
  metadataStatus: "valid",
  metadataVerifiedAt: now,
  name: "Yield Agent",
  ownerAddress: "0x1111111111111111111111111111111111111111",
  registeredAt: now,
  registeredBlock: 100,
  registrationLogIndex: 0,
  registrationTransactionHash: `0x${"1".repeat(64)}`,
  registryAddress: "0x2222222222222222222222222222222222222222",
  reputation: {
    failedJobs: 1,
    feedbackCount: 9,
    lastActivityAt: now,
    reputationScore: 80,
    source: "verified fixture",
    sourceObservedAt: now,
    successfulJobs: 9,
    updatedAt: now,
  },
  score: {
    calculatedAt: now,
    components: {
      availability: 100,
      capability: 100,
      metadata: 100,
      reliability: 100,
      reputation: 80,
      trackRecord: 90,
    },
    confidence: 1,
    score: 95,
    sourceFreshness: {
      healthAt: now,
      metadataAt: now,
      reputationAt: now,
    },
    version: "sift-evidence-v2.2.0",
  },
  services: [
    {
      activationMethod: "a2a",
      availabilityCheckedAt: now,
      availabilityStatus: "available",
      endpoint: "https://agent.example/a2a",
      metadata: null,
      serviceType: "A2A",
      version: "1.0",
    },
  ],
  taskHistory: [
    {
      blockNumber: 101,
      confirmedAt: now,
      onchainJobId: "7",
      transactionHash: `0x${"2".repeat(64)}`,
    },
  ],
  x402Supported: false,
};

describe("public API presentation", () => {
  it("returns the direct six-criterion Sift Score", () => {
    const score = toPublicAgentScore(profile);

    assert.equal(score.value, 95);
    assert.equal(score.criteria.length, 6);
    assert.equal(
      score.criteria.reduce((total, criterion) => total + criterion.points, 0),
      score.value,
    );
  });

  it("keeps profile and task responses free of private hiring fields", () => {
    const response = JSON.stringify({
      profile: toPublicAgentProfile(profile),
      tasks: toPublicAgentTasks(profile),
    });

    assert.doesNotMatch(response, /walletAddress|resumeToken|maximumSpend|mission/);
    assert.match(response, /onchainJobId/);
    assert.match(response, /reportedTotals/);
  });
});
