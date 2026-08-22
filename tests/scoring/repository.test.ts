import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SiftScoreAssessment } from "../../features/scoring/model";
import {
  createScoreRepository,
  mapScoreRecord,
  type ScoreRepositorySources,
} from "../../lib/db/score-repository";
import type { TableInsert, TableRow } from "../../lib/db/database.types";

const agentId = "11111111-1111-4111-8111-111111111111";
const timestamp = "2026-08-22T12:00:00.000Z";

const agent: TableRow<"agents"> = {
  active: true,
  agent_id: "42",
  agent_uri: "https://agent.test-only.dev/registration.json",
  category: null,
  chain_id: 97,
  created_at: timestamp,
  description: "Test-only scoring fixture.",
  id: agentId,
  image_url: null,
  last_synced_at: timestamp,
  metadata_status: "valid",
  metadata_verified_at: timestamp,
  name: "Scoring fixture",
  owner_address: "0x1111111111111111111111111111111111111111",
  registered_at: timestamp,
  registered_block: 1,
  registry_address: "0x8004a818bfb912233c491871b3d84c89a494bd9e",
  updated_at: timestamp,
  x402_supported: null,
};

const health: TableRow<"agent_health"> = {
  agent_db_id: agentId,
  check_count: 3,
  checked_endpoint: "https://agent.test-only.dev/health",
  created_at: timestamp,
  endpoint_hash: "a".repeat(64),
  failure_count: 0,
  last_checked_at: timestamp,
  last_success_at: timestamp,
  outcome: "success",
  response_time_ms: 42,
  service_type: "health",
  status: "online",
  success_count: 3,
  updated_at: timestamp,
};

const reputation: TableRow<"agent_reputation"> = {
  agent_db_id: agentId,
  created_at: timestamp,
  failed_jobs: 1,
  feedback_count: 5,
  last_activity_at: timestamp,
  reputation_score: 75,
  source: "test-only normalized source",
  source_observed_at: timestamp,
  successful_jobs: 4,
  updated_at: timestamp,
};

const service: TableRow<"agent_services"> = {
  agent_db_id: agentId,
  created_at: timestamp,
  endpoint: "https://agent.test-only.dev/health",
  id: "22222222-2222-4222-8222-222222222222",
  metadata: null,
  service_type: "health",
  updated_at: timestamp,
  version: "1.0",
};

const assessment: SiftScoreAssessment = {
  components: {
    availability: 100,
    capability: 65,
    metadata: 85,
    reliability: 100,
    reputation: 75,
    trackRecord: 80,
  },
  confidence: 1,
  evidenceSnapshot: { evidenceWeight: 100 },
  limitations: [],
  score: 85,
  sourceFreshness: {
    healthAt: timestamp,
    metadataAt: timestamp,
    reputationAt: timestamp,
  },
  version: "sift-evidence-v1.0.0",
};

function sources(
  overrides: Partial<ScoreRepositorySources> = {},
): ScoreRepositorySources {
  return {
    listAgentRecords: async () => [agent],
    listCandidateIds: async () => [agentId],
    listHealthRecords: async () => [health],
    listReputationRecords: async () => [reputation],
    listServiceRecords: async () => [service],
    upsertScores: async () => undefined,
    ...overrides,
  };
}

describe("score repository integration boundary", () => {
  it("composes candidates from bounded bulk evidence queries", async () => {
    const calls: string[] = [];
    const repository = createScoreRepository(
      sources({
        listAgentRecords: async () => {
          calls.push("agents");
          return [agent];
        },
        listHealthRecords: async () => {
          calls.push("health");
          return [health];
        },
        listReputationRecords: async () => {
          calls.push("reputation");
          return [reputation];
        },
        listServiceRecords: async () => {
          calls.push("services");
          return [service];
        },
      }),
    );

    const candidates = await repository.listCandidates(
      25,
      "sift-evidence-v1.0.0",
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].health?.checkCount, 3);
    assert.equal(candidates[0].reputation?.source, reputation.source);
    assert.equal(candidates[0].services[0].serviceType, "health");
    assert.deepEqual(calls.sort(), ["agents", "health", "reputation", "services"]);
  });

  it("does not issue evidence queries when the candidate queue is empty", async () => {
    let evidenceQueries = 0;
    const repository = createScoreRepository(
      sources({
        listAgentRecords: async () => {
          evidenceQueries += 1;
          return [];
        },
        listCandidateIds: async () => [],
      }),
    );

    assert.deepEqual(
      await repository.listCandidates(25, "sift-evidence-v1.0.0"),
      [],
    );
    assert.equal(evidenceQueries, 0);
  });

  it("validates and upserts publishable and withheld assessments", async () => {
    let writes: readonly TableInsert<"agent_scores">[] = [];
    const repository = createScoreRepository(
      sources({
        upsertScores: async (records) => {
          writes = records;
        },
      }),
    );

    await repository.save([
      { agentDbId: agentId, assessment, calculatedAt: timestamp },
      {
        agentDbId: "33333333-3333-4333-8333-333333333333",
        assessment: {
          ...assessment,
          confidence: 0.2,
          score: null,
        },
        calculatedAt: timestamp,
      },
    ]);

    assert.equal(writes.length, 2);
    assert.equal(writes[0].sift_score, 85);
    assert.equal(writes[1].sift_score, null);
    assert.deepEqual(writes[0].source_freshness, {
      healthAt: timestamp,
      metadataAt: timestamp,
      reputationAt: timestamp,
    });
  });

  it("maps persisted score freshness without trusting malformed JSON", () => {
    const row: TableRow<"agent_scores"> = {
      agent_db_id: agentId,
      availability_component: 100,
      calculated_at: timestamp,
      capability_component: 65,
      confidence: 0.6,
      created_at: timestamp,
      evidence_snapshot: {},
      metadata_component: 85,
      reliability_component: null,
      reputation_component: null,
      score_version: "sift-evidence-v1.0.0",
      sift_score: 90,
      source_freshness: {
        healthAt: timestamp,
        metadataAt: "invalid",
        reputationAt: 100,
      },
      track_record_component: null,
      updated_at: timestamp,
    };

    assert.deepEqual(mapScoreRecord(row).sourceFreshness, {
      healthAt: timestamp,
      metadataAt: null,
      reputationAt: null,
    });
  });
});
