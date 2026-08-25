import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AgentProfile } from "../../features/agents/model";
import { findContextualMatch } from "../../features/comparison/match";
import type { PersistedSiftScore } from "../../features/scoring/model";

function persistedScore(score: number): PersistedSiftScore {
  return {
    calculatedAt: new Date().toISOString(),
    components: {
      availability: 80,
      capability: 80,
      metadata: 80,
      reliability: 80,
      reputation: 80,
      trackRecord: 80,
    },
    confidence: 0.8,
    score,
    sourceFreshness: {
      healthAt: new Date().toISOString(),
      metadataAt: new Date().toISOString(),
      reputationAt: new Date().toISOString(),
    },
    version: "test-only-score-version",
  };
}

function profile(
  agentId: string,
  overrides: Partial<AgentProfile> = {},
): AgentProfile {
  return {
    active: true,
    agentId,
    agentUri: null,
    categories: [],
    categorySource: null,
    chainId: 97,
    description: null,
    health: null,
    imageUrl: null,
    lastSyncedAt: null,
    metadataStatus: "valid",
    metadataVerifiedAt: null,
    name: null,
    ownerAddress: null,
    registeredAt: null,
    registeredBlock: null,
    registrationLogIndex: null,
    registrationTransactionHash: null,
    registryAddress: "0x8004a818bfb912233c491871b3d84c89a494bd9e",
    reputation: null,
    score: null,
    services: [],
    x402Supported: null,
    ...overrides,
  };
}

describe("contextual comparison", () => {
  it("highlights a unique goal match from supported category and metadata", () => {
    const match = findContextualMatch(
      [
        profile("1", {
          categories: ["health-factor-monitoring"],
          categorySource: "deterministic-keyword",
          description: "Monitors loan collateral and liquidation conditions.",
        }),
        profile("2", {
          categories: ["yield-optimisation"],
          description: "Researches yield positions.",
        }),
      ],
      "Protect my loan from liquidation",
    );

    assert.equal(match?.agent.agentId, "1");
    assert.equal(match?.categoryMatched, true);
    assert.deepEqual(match?.matchedTerms, ["loan", "liquidation"]);
    assert.match(match?.reason ?? "", /selected agent matches/i);
  });

  it("does not force a winner when contextual evidence is tied", () => {
    const candidates = [
      profile("1", {
        categories: ["grid-trading"],
        description: "Grid trading automation.",
      }),
      profile("2", {
        categories: ["grid-trading"],
        description: "Grid trading automation.",
      }),
    ];

    assert.equal(findContextualMatch(candidates, "grid trading"), null);
  });

  it("does not treat an unknown score as worse during a contextual tie", () => {
    const candidates = [
      profile("1", {
        categories: ["grid-trading"],
        description: "Grid trading automation.",
        score: persistedScore(91),
      }),
      profile("2", {
        categories: ["grid-trading"],
        description: "Grid trading automation.",
        score: null,
      }),
    ];

    assert.equal(findContextualMatch(candidates, "grid trading"), null);
  });

  it("uses supported current scores only to resolve a complete evidence tie", () => {
    const match = findContextualMatch(
      [
        profile("1", {
          categories: ["grid-trading"],
          description: "Grid trading automation.",
          score: persistedScore(72),
        }),
        profile("2", {
          categories: ["grid-trading"],
          description: "Grid trading automation.",
          score: persistedScore(88),
        }),
      ],
      "grid trading",
    );

    assert.equal(match?.agent.agentId, "2");
    assert.match(match?.reason ?? "", /resolved the evidence tie/i);
  });

  it("omits a highlight when the goal has insufficient supported evidence", () => {
    const match = findContextualMatch(
      [
        profile("1", { description: "Summarises information." }),
        profile("2", { description: "Routes requests." }),
      ],
      "Summarise legal documents",
    );

    assert.equal(match, null);
    assert.equal(findContextualMatch([profile("1"), profile("2")], ""), null);
  });
});
