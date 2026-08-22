import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createFeaturedAgentRepository,
  type FeaturedAgentSources,
} from "../../lib/db/featured-agent-repository";
import type { TableRow } from "../../lib/db/database.types";

const asOf = new Date("2026-08-22T12:00:00.000Z");
const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
] as const;

function score(
  agentDbId: string,
  siftScore: number,
): TableRow<"agent_scores"> {
  return {
    agent_db_id: agentDbId,
    availability_component: 100,
    calculated_at: "2026-08-22T11:00:00.000Z",
    capability_component: 80,
    confidence: 0.8,
    created_at: "2026-08-22T11:00:00.000Z",
    evidence_snapshot: {},
    metadata_component: 80,
    reliability_component: 90,
    reputation_component: null,
    score_version: "sift-evidence-v1.0.0",
    sift_score: siftScore,
    source_freshness: {
      healthAt: "2026-08-22T11:00:00.000Z",
      metadataAt: "2026-08-22T10:00:00.000Z",
      reputationAt: null,
    },
    track_record_component: null,
    updated_at: "2026-08-22T11:00:00.000Z",
  };
}

function health(agentDbId: string): TableRow<"agent_health"> {
  return {
    agent_db_id: agentDbId,
    check_count: 5,
    checked_endpoint: "https://agent.test-only.dev/health",
    created_at: "2026-08-22T11:00:00.000Z",
    endpoint_hash: "a".repeat(64),
    failure_count: 0,
    last_checked_at: "2026-08-22T11:00:00.000Z",
    last_success_at: "2026-08-22T11:00:00.000Z",
    outcome: "success",
    response_time_ms: 20,
    service_type: "health",
    status: "online",
    success_count: 5,
    updated_at: "2026-08-22T11:00:00.000Z",
  };
}

function sources(
  overrides: Partial<FeaturedAgentSources> = {},
): FeaturedAgentSources {
  return {
    listAgents: async () =>
      ids.map((id, index) => ({
        agent_id: String(index + 1),
        chain_id: 97,
        description: `Test-only agent ${index + 1}`,
        id,
        image_url: null,
        name: `Agent ${index + 1}`,
      })),
    listCandidateIds: async () => ids,
    listHealth: async () => ids.map(health),
    listScores: async () => [score(ids[0], 91), score(ids[1], 84)],
    ...overrides,
  };
}

describe("featured scored-agent rule", () => {
  it("preserves current score order and requires matching online evidence", async () => {
    let freshness = "";
    const repository = createFeaturedAgentRepository(
      sources({
        listCandidateIds: async (_limit, _version, freshAfter) => {
          freshness = freshAfter;
          return ids;
        },
      }),
    );

    const result = await repository.listFeatured(2, asOf);

    assert.equal(freshness, "2026-08-21T12:00:00.000Z");
    assert.deepEqual(
      result.map((agent) => [agent.agentId, agent.score.score]),
      [
        ["1", 91],
        ["2", 84],
      ],
    );
    assert.ok(result.every((agent) => agent.health.status === "online"));
  });

  it("excludes a score without qualifying current health", async () => {
    const repository = createFeaturedAgentRepository(
      sources({ listHealth: async () => [health(ids[1])] }),
    );

    const result = await repository.listFeatured(2, asOf);

    assert.deepEqual(result.map((agent) => agent.agentId), ["2"]);
  });

  it("does not query agents or health when no eligible score exists", async () => {
    let evidenceQueries = 0;
    const repository = createFeaturedAgentRepository(
      sources({
        listAgents: async () => {
          evidenceQueries += 1;
          return [];
        },
        listHealth: async () => {
          evidenceQueries += 1;
          return [];
        },
        listCandidateIds: async () => [],
        listScores: async () => {
          evidenceQueries += 1;
          return [];
        },
      }),
    );

    assert.deepEqual(await repository.listFeatured(3, asOf), []);
    assert.equal(evidenceQueries, 0);
  });

  it("rejects an unbounded featured request", async () => {
    const repository = createFeaturedAgentRepository(sources());

    await assert.rejects(() => repository.listFeatured(6, asOf), /1 to 5/);
  });
});
