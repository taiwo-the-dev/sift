import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createHealthRepository,
  type HealthRepositorySources,
} from "../../lib/db/health-repository";
import type { TableInsert, TableRow } from "../../lib/db/database.types";

const agentDbId = "11111111-1111-4111-8111-111111111111";
const timestamp = "2026-08-22T12:00:00.000Z";

const agent: Pick<
  TableRow<"agents">,
  "agent_id" | "chain_id" | "id"
> = {
  agent_id: "42",
  chain_id: 97,
  id: agentDbId,
};

const health: TableRow<"agent_health"> = {
  agent_db_id: agentDbId,
  check_count: 4,
  checked_endpoint: "https://agent.test-only.dev/health",
  created_at: timestamp,
  endpoint_hash: "a".repeat(64),
  failure_count: 1,
  last_checked_at: timestamp,
  last_success_at: "2026-08-22T11:00:00.000Z",
  outcome: "timeout",
  response_time_ms: null,
  service_type: "health",
  status: "offline",
  success_count: 3,
  updated_at: timestamp,
};

const service: Pick<
  TableRow<"agent_services">,
  "agent_db_id" | "endpoint" | "service_type"
> = {
  agent_db_id: agentDbId,
  endpoint: "https://agent.test-only.dev/health",
  service_type: "health",
};

function sources(
  overrides: Partial<HealthRepositorySources> = {},
): HealthRepositorySources {
  return {
    listAgentRecords: async () => [agent],
    listCandidateIds: async () => [agentDbId],
    listHealthRecords: async () => [health],
    listServiceRecords: async () => [service],
    upsertHealth: async () => undefined,
    ...overrides,
  };
}

describe("health repository integration boundary", () => {
  it("composes a bounded candidate with previous endpoint history", async () => {
    const repository = createHealthRepository(sources());
    const candidates = await repository.listCandidates(
      20,
      "2026-08-22T06:00:00.000Z",
    );

    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].agentId, "42");
    assert.equal(candidates[0].previousHealth?.successCount, 3);
    assert.deepEqual(candidates[0].services, [
      {
        endpoint: "https://agent.test-only.dev/health",
        serviceType: "health",
      },
    ]);
  });

  it("does not fan out when no health candidate is due", async () => {
    let evidenceQueries = 0;
    const repository = createHealthRepository(
      sources({
        listAgentRecords: async () => {
          evidenceQueries += 1;
          return [];
        },
        listCandidateIds: async () => [],
      }),
    );

    assert.deepEqual(
      await repository.listCandidates(20, "2026-08-22T06:00:00.000Z"),
      [],
    );
    assert.equal(evidenceQueries, 0);
  });

  it("validates bounded observations before upserting", async () => {
    let writes: readonly TableInsert<"agent_health">[] = [];
    const repository = createHealthRepository(
      sources({
        upsertHealth: async (records) => {
          writes = records;
        },
      }),
    );

    await repository.save([
      {
        agentDbId,
        checkCount: 5,
        checkedEndpoint: health.checked_endpoint,
        endpointHash: health.endpoint_hash,
        failureCount: 0,
        lastCheckedAt: timestamp,
        lastSuccessAt: timestamp,
        outcome: "success",
        responseTimeMs: 50,
        serviceType: "health",
        status: "online",
        successCount: 4,
      },
    ]);

    assert.equal(writes.length, 1);
    assert.equal(writes[0].check_count, 5);
    assert.equal(writes[0].outcome, "success");
  });
});
