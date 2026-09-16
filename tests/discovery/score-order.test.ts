import assert from "node:assert/strict";
import test from "node:test";

import type { DiscoveryAgent } from "../../features/discovery/model";
import { orderDiscoveryAgentsByDisplayedScore } from "../../lib/db/discovery-repository";

function agent(
  agentId: string,
  name: string,
  score: number,
): DiscoveryAgent {
  return {
    active: true,
    agentDbId: `00000000-0000-4000-8000-${agentId.padStart(12, "0")}`,
    agentId,
    categories: [],
    categoryEvidence: [],
    categorySource: null,
    chainId: 56,
    description: null,
    health: null,
    imageUrl: null,
    lastSyncedAt: "2026-09-15T08:00:00.000Z",
    metadataStatus: "valid",
    name,
    ownerAddress: "0x1111111111111111111111111111111111111111",
    registeredAt: "2026-09-15T08:00:00.000Z",
    registeredBlock: 1,
    registryAddress: "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432",
    relevance: 0,
    score: {
      calculatedAt: "2026-09-15T08:00:00.000Z",
      components: {
        availability: null,
        capability: score * 10,
        metadata: null,
        reliability: null,
        reputation: null,
        trackRecord: null,
      },
      confidence: 0.1,
      score,
      sourceFreshness: {
        healthAt: null,
        metadataAt: null,
        reputationAt: null,
      },
      version: "sift-evidence-v2.2.0",
    },
    services: [],
    x402Supported: false,
  };
}

test("orders a discovery page by its displayed Sift Score and then name", () => {
  const agents = [
    agent("3", "Zulu", 4),
    agent("2", "Beta", 8),
    agent("1", "Alpha", 8),
  ];

  assert.deepEqual(
    orderDiscoveryAgentsByDisplayedScore(agents, "score-desc").map(
      (item) => item.name,
    ),
    ["Alpha", "Beta", "Zulu"],
  );
  assert.deepEqual(
    orderDiscoveryAgentsByDisplayedScore(agents, "score-asc").map(
      (item) => item.name,
    ),
    ["Zulu", "Alpha", "Beta"],
  );
});
