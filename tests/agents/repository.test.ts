import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createAgentProfileRepository,
  type AgentProfileSources,
} from "../../lib/db/agent-profile-repository";
import type { TableRow } from "../../lib/db/database.types";

const agent: TableRow<"agents"> = {
  active: true,
  agent_id: "1887",
  agent_uri: "data:application/json;base64,e30=",
  category: null,
  chain_id: 97,
  created_at: "2026-08-21T18:58:31.000Z",
  description: "Protects a lending position from liquidation risk.",
  id: "11111111-1111-4111-8111-111111111111",
  image_url: null,
  last_synced_at: "2026-08-22T08:50:02.000Z",
  metadata_status: "valid",
  metadata_verified_at: "2026-08-22T08:50:02.000Z",
  name: "Safety Sentinel",
  owner_address: "0x1111111111111111111111111111111111111111",
  registered_at: "2026-08-21T18:58:31.000Z",
  registered_block: 126427310,
  registry_address: "0x8004a818bfb912233c491871b3d84c89a494bd9e",
  updated_at: "2026-08-22T08:50:02.000Z",
  x402_supported: true,
};

const service: TableRow<"agent_services"> = {
  agent_db_id: agent.id,
  created_at: "2026-08-21T18:58:31.000Z",
  endpoint: "https://agent.example/mcp",
  id: "22222222-2222-4222-8222-222222222222",
  metadata: { skills: ["position monitoring"] },
  service_type: "MCP",
  updated_at: "2026-08-21T18:58:31.000Z",
  version: "1.0",
};

function sources(
  overrides: Partial<AgentProfileSources> = {},
): AgentProfileSources {
  return {
    findAgent: async () => agent,
    findHealth: async () => null,
    findReputation: async () => null,
    findScore: async () => null,
    listServices: async () => [service],
    ...overrides,
  };
}

describe("agent profile repository composition", () => {
  it("composes a complete real-data profile without a score", async () => {
    const health: TableRow<"agent_health"> = {
      agent_db_id: agent.id,
      check_count: 4,
      checked_endpoint: "https://agent.example/health",
      created_at: "2026-08-22T08:00:00.000Z",
      endpoint_hash:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      failure_count: 0,
      last_checked_at: "2026-08-22T08:00:00.000Z",
      last_success_at: "2026-08-22T08:00:00.000Z",
      outcome: "success",
      response_time_ms: 120,
      service_type: "health",
      status: "online",
      success_count: 4,
      updated_at: "2026-08-22T08:00:00.000Z",
    };
    const reputation: TableRow<"agent_reputation"> = {
      agent_db_id: agent.id,
      created_at: "2026-08-22T08:00:00.000Z",
      failed_jobs: null,
      feedback_count: 4,
      last_activity_at: "2026-08-22T07:00:00.000Z",
      reputation_score: 4.5,
      source: "test-only fixture",
      source_observed_at: "2026-08-22T07:00:00.000Z",
      successful_jobs: null,
      updated_at: "2026-08-22T08:00:00.000Z",
    };
    const repository = createAgentProfileRepository(
      sources({
        findHealth: async () => health,
        findReputation: async () => reputation,
      }),
    );

    const profile = await repository.findByIdentity(97, "1887");

    assert.equal(profile?.name, "Safety Sentinel");
    assert.deepEqual(profile?.categories, ["health-factor-monitoring"]);
    assert.equal(profile?.services[0].serviceType, "MCP");
    assert.equal(profile?.health?.responseTimeMs, 120);
    assert.equal(profile?.reputation?.feedbackCount, 4);
    assert.equal("siftScore" in (profile ?? {}), false);
  });

  it("keeps optional evidence absent for a partial indexed identity", async () => {
    const sparseAgent: TableRow<"agents"> = {
      ...agent,
      active: null,
      description: null,
      metadata_status: "unavailable",
      metadata_verified_at: null,
      name: null,
      x402_supported: null,
    };
    const repository = createAgentProfileRepository(
      sources({
        findAgent: async () => sparseAgent,
        listServices: async () => [],
      }),
    );

    const profile = await repository.findByIdentity(97, "1887");

    assert.equal(profile?.name, null);
    assert.equal(profile?.health, null);
    assert.equal(profile?.reputation, null);
    assert.deepEqual(profile?.services, []);
  });

  it("returns null without querying child tables when identity is missing", async () => {
    let childQueries = 0;
    const repository = createAgentProfileRepository(
      sources({
        findAgent: async () => null,
        findHealth: async () => {
          childQueries += 1;
          return null;
        },
        findReputation: async () => {
          childQueries += 1;
          return null;
        },
        findScore: async () => {
          childQueries += 1;
          return null;
        },
        listServices: async () => {
          childQueries += 1;
          return [];
        },
      }),
    );

    assert.equal(await repository.findByIdentity(97, "9999"), null);
    assert.equal(childQueries, 0);
  });
});
