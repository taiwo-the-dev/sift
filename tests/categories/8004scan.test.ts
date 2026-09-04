import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { TableInsert, TableRow } from "../../lib/db/database.types";
import type { ExternalEvidenceRepository } from "../../lib/db/external-evidence-repository";
import { create8004ScanClient } from "../../lib/integrations/8004scan";

function memoryCache(): ExternalEvidenceRepository & { writes: TableInsert<"agent_external_evidence">[] } {
  const records = new Map<string, TableRow<"agent_external_evidence">>();
  const writes: TableInsert<"agent_external_evidence">[] = [];
  return {
    async find(agentDbId) {
      return records.get(agentDbId) ?? null;
    },
    async upsert(record) {
      writes.push(record);
      records.set(record.agent_db_id, {
        conflict_fields: [],
        created_at: "2026-09-03T00:00:00.000Z",
        raw_payload: null,
        updated_at: "2026-09-03T00:00:00.000Z",
        ...record,
      } as TableRow<"agent_external_evidence">);
    },
    writes,
  };
}

const localAgent = {
  agentDbId: "11111111-1111-4111-8111-111111111111",
  agentId: "323332",
  categories: ["grid-trading"] as const,
  chainId: 56,
  ownerAddress: "0x1111111111111111111111111111111111111111",
  registryAddress: "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432",
};

function scanResponse(owner = localAgent.ownerAddress): Response {
  return Response.json({
    average_score: null,
    categories: ["Grid Trading"],
    chain_id: 56,
    contract_address: localAgent.registryAddress,
    name: "Grid",
    owner_address: owner,
    services: [{ name: "A2A" }],
    token_id: "323332",
    total_feedbacks: 0,
    total_validations: 0,
  });
}

describe("8004scan adapter", () => {
  it("maps and caches a source-labelled cross-check", async () => {
    const cache = memoryCache();
    let requests = 0;
    const client = create8004ScanClient({
      apiKey: "test-key",
      cache,
      fetchImpl: async () => {
        requests += 1;
        return scanResponse();
      },
      now: () => new Date("2026-09-03T12:00:00.000Z"),
    });

    const first = await client.crossCheck(localAgent);
    const second = await client.crossCheck(localAgent);

    assert.equal(first.availability, "available");
    assert.equal(first.feedbackCount, 0);
    assert.equal(first.source, "8004scan");
    assert.equal(second.observedAt, first.observedAt);
    assert.equal(requests, 1);
    assert.equal(cache.writes.length, 1);
  });

  it("records conflicts without overwriting local identity", async () => {
    const client = create8004ScanClient({
      cache: memoryCache(),
      fetchImpl: async () => scanResponse("0x2222222222222222222222222222222222222222"),
      now: () => new Date("2026-09-03T12:00:00.000Z"),
    });
    const result = await client.crossCheck(localAgent);

    assert.equal(result.availability, "conflict");
    assert.deepEqual(result.conflictFields, ["ownerAddress"]);
    assert.equal(localAgent.ownerAddress, "0x1111111111111111111111111111111111111111");
  });

  it("degrades to unavailable and applies the anonymous rate interval", async () => {
    const cache = memoryCache();
    let currentTime = Date.parse("2026-09-03T12:00:00.000Z");
    const waits: number[] = [];
    const client = create8004ScanClient({
      cache,
      fetchImpl: async () => {
        throw new Error("outage");
      },
      now: () => new Date(currentTime),
      wait: async (milliseconds) => {
        waits.push(milliseconds);
        currentTime += milliseconds;
      },
    });

    const first = await client.crossCheck(localAgent);
    const second = await client.crossCheck({
      ...localAgent,
      agentDbId: "22222222-2222-4222-8222-222222222222",
      agentId: "330536",
    });

    assert.equal(first.availability, "unavailable");
    assert.equal(second.availability, "unavailable");
    assert.deepEqual(waits, [2_100]);
  });

  it("refreshes stale cache entries instead of presenting them as current", async () => {
    const cache = memoryCache();
    let currentTime = Date.parse("2026-09-03T12:00:00.000Z");
    let requests = 0;
    const client = create8004ScanClient({
      apiKey: "test-key",
      cache,
      fetchImpl: async () => {
        requests += 1;
        return scanResponse();
      },
      now: () => new Date(currentTime),
    });

    await client.crossCheck(localAgent);
    currentTime += 7 * 60 * 60 * 1_000;
    await client.crossCheck(localAgent);

    assert.equal(requests, 2);
    assert.equal(cache.writes.length, 2);
  });

  it("keeps truly absent API fields distinct from zero-valued evidence", async () => {
    const client = create8004ScanClient({
      apiKey: "test-key",
      cache: memoryCache(),
      fetchImpl: async () =>
        Response.json({
          chain_id: 56,
          contract_address: localAgent.registryAddress,
          owner_address: null,
          token_id: localAgent.agentId,
        }),
      now: () => new Date("2026-09-03T12:00:00.000Z"),
    });

    const result = await client.crossCheck({ ...localAgent, ownerAddress: null });

    assert.equal(result.availability, "field-unavailable");
    assert.equal(result.feedbackCount, null);
    assert.equal(result.reputationScore, null);
  });
});
