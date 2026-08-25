import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createComparisonRepository,
  type ComparisonSources,
} from "../../lib/db/comparison-repository";
import type { TableRow } from "../../lib/db/database.types";

function agent(
  agentId: string,
  id: string,
  overrides: Partial<TableRow<"agents">> = {},
): TableRow<"agents"> {
  return {
    active: true,
    agent_id: agentId,
    agent_uri: `ipfs://test-only-${agentId}`,
    category: null,
    chain_id: 97,
    created_at: "2026-08-22T08:00:00.000Z",
    description: `Test-only agent ${agentId}`,
    id,
    image_url: null,
    last_synced_at: "2026-08-22T09:00:00.000Z",
    metadata_status: "valid",
    metadata_verified_at: "2026-08-22T09:00:00.000Z",
    name: `Test Agent ${agentId}`,
    owner_address: "0x1111111111111111111111111111111111111111",
    registered_at: "2026-08-22T08:00:00.000Z",
    registered_block: 100,
    registration_log_index: 0,
    registration_transaction_hash: `0x${"1".repeat(64)}`,
    registry_address: "0x8004a818bfb912233c491871b3d84c89a494bd9e",
    updated_at: "2026-08-22T09:00:00.000Z",
    x402_supported: null,
    ...overrides,
  };
}

const firstAgent = agent(
  "101",
  "11111111-1111-4111-8111-111111111111",
  { description: "Grid trading automation" },
);
const secondAgent = agent(
  "102",
  "22222222-2222-4222-8222-222222222222",
  { metadata_status: "unavailable", metadata_verified_at: null },
);
const thirdAgent = agent(
  "103",
  "33333333-3333-4333-8333-333333333333",
  { description: null, name: null },
);

const service: TableRow<"agent_services"> = {
  agent_db_id: firstAgent.id,
  created_at: "2026-08-22T09:00:00.000Z",
  endpoint: "https://test-only.example/mcp",
  id: "44444444-4444-4444-8444-444444444444",
  metadata: { capabilities: ["test-only order routing"] },
  service_type: "MCP",
  updated_at: "2026-08-22T09:00:00.000Z",
  version: "1.0",
};

const health: TableRow<"agent_health"> = {
  agent_db_id: firstAgent.id,
  check_count: 1,
  checked_endpoint: "https://test-only.example/health",
  created_at: "2026-08-22T09:00:00.000Z",
  endpoint_hash: "a".repeat(64),
  failure_count: 0,
  last_checked_at: "2026-08-22T09:00:00.000Z",
  last_success_at: "2026-08-22T09:00:00.000Z",
  outcome: "success",
  response_time_ms: 100,
  service_type: "health",
  status: "online",
  success_count: 1,
  updated_at: "2026-08-22T09:00:00.000Z",
};

const reputation: TableRow<"agent_reputation"> = {
  agent_db_id: secondAgent.id,
  created_at: "2026-08-22T09:00:00.000Z",
  failed_jobs: null,
  feedback_count: 5,
  last_activity_at: "2026-08-22T08:30:00.000Z",
  reputation_score: 4.2,
  source: "test-only fixture source",
  source_observed_at: "2026-08-22T08:30:00.000Z",
  successful_jobs: null,
  updated_at: "2026-08-22T09:00:00.000Z",
};

const score: TableRow<"agent_scores"> = {
  agent_db_id: firstAgent.id,
  availability_component: 80,
  calculated_at: "2026-08-22T09:00:00.000Z",
  capability_component: 80,
  confidence: 0.5,
  created_at: "2026-08-22T09:00:00.000Z",
  evidence_snapshot: { fixture: "test-only" },
  metadata_component: 80,
  reliability_component: null,
  reputation_component: null,
  score_version: "test-only-score-version",
  sift_score: 80,
  source_freshness: {
    healthAt: "2026-08-22T09:00:00.000Z",
    metadataAt: "2026-08-22T09:00:00.000Z",
    reputationAt: null,
  },
  track_record_component: null,
  updated_at: "2026-08-22T09:00:00.000Z",
};

describe("comparison repository integration boundary", () => {
  it("loads two to four agents and mixed evidence in bounded bulk operations", async () => {
    const calls = {
      agents: 0,
      health: 0,
      reputation: 0,
      scores: 0,
      services: 0,
    };
    const sources: ComparisonSources = {
      async listAgents(references) {
        calls.agents += 1;
        assert.deepEqual(references, [
          { agentId: "101", chainId: 97 },
          { agentId: "102", chainId: 97 },
          { agentId: "103", chainId: 97 },
          { agentId: "404", chainId: 97 },
        ]);
        return [thirdAgent, firstAgent, secondAgent];
      },
      async listHealth(agentDbIds) {
        calls.health += 1;
        assert.equal(agentDbIds.length, 3);
        return [health];
      },
      async listReputation() {
        calls.reputation += 1;
        return [reputation];
      },
      async listScores() {
        calls.scores += 1;
        return [score];
      },
      async listServices() {
        calls.services += 1;
        return [service];
      },
    };
    const result = await createComparisonRepository(sources).findByReferences([
      { agentId: "101", chainId: 97 },
      { agentId: "102", chainId: 97 },
      { agentId: "103", chainId: 97 },
      { agentId: "404", chainId: 97 },
    ]);

    assert.deepEqual(
      result.agents.map((profile) => profile.agentId),
      ["101", "102", "103"],
    );
    assert.equal(result.agents[0]?.health?.status, "online");
    assert.equal(result.agents[0]?.score?.score, 80);
    assert.equal(result.agents[1]?.reputation?.feedbackCount, 5);
    assert.equal(result.agents[1]?.health, null);
    assert.equal(result.agents[2]?.score, null);
    assert.deepEqual(result.missingAgents, [
      {
        reason: "not-found",
        reference: { agentId: "404", chainId: 97 },
      },
    ]);
    assert.deepEqual(calls, {
      agents: 1,
      health: 1,
      reputation: 1,
      scores: 1,
      services: 1,
    });
  });

  it("treats an ambiguous chain and agent reference as unavailable", async () => {
    let evidenceCalls = 0;
    const duplicate = agent(
      "101",
      "55555555-5555-4555-8555-555555555555",
      { registry_address: "0x2222222222222222222222222222222222222222" },
    );
    const sources: ComparisonSources = {
      listAgents: async () => [firstAgent, duplicate],
      listHealth: async () => {
        evidenceCalls += 1;
        return [];
      },
      listReputation: async () => {
        evidenceCalls += 1;
        return [];
      },
      listScores: async () => {
        evidenceCalls += 1;
        return [];
      },
      listServices: async () => {
        evidenceCalls += 1;
        return [];
      },
    };
    const result = await createComparisonRepository(sources).findByReferences([
      { agentId: "101", chainId: 97 },
    ]);

    assert.deepEqual(result.agents, []);
    assert.deepEqual(result.missingAgents, [
      {
        reason: "ambiguous",
        reference: { agentId: "101", chainId: 97 },
      },
    ]);
    assert.equal(evidenceCalls, 0);
  });

  it("deduplicates and caps direct repository input before querying", async () => {
    let requestedAgentIds: readonly string[] = [];
    const sources: ComparisonSources = {
      listAgents: async (references) => {
        requestedAgentIds = references.map((reference) => reference.agentId);
        return [];
      },
      listHealth: async () => [],
      listReputation: async () => [],
      listScores: async () => [],
      listServices: async () => [],
    };

    await createComparisonRepository(sources).findByReferences([
      { agentId: "1", chainId: 97 },
      { agentId: "1", chainId: 97 },
      { agentId: "2", chainId: 97 },
      { agentId: "3", chainId: 97 },
      { agentId: "4", chainId: 97 },
      { agentId: "5", chainId: 97 },
    ]);

    assert.deepEqual(requestedAgentIds, ["1", "2", "3", "4"]);
  });
});
