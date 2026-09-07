import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createCategoryRepository } from "../../lib/db/category-repository";
import type { Database } from "../../lib/db/database.types";

describe("category classification repository", () => {
  it("pages agents before loading their services in a bounded second query", async () => {
    const calls: unknown[] = [];
    const agents = [
      {
        agent_id: "301",
        category: null,
        description: "Runs a bounded grid strategy.",
        id: "22222222-2222-4222-8222-222222222222",
        last_synced_at: "2026-09-07T08:00:00.000Z",
        metadata_verified_at: "2026-09-07T07:55:00.000Z",
        name: "Grid Operator",
        updated_at: "2026-09-07T08:00:00.000Z",
      },
      {
        agent_id: "302",
        category: "Yield Optimisation",
        description: "Compares supported yield strategies.",
        id: "33333333-3333-4333-8333-333333333333",
        last_synced_at: "2026-09-07T08:01:00.000Z",
        metadata_verified_at: null,
        name: "Yield Operator",
        updated_at: "2026-09-07T08:01:00.000Z",
      },
    ];
    const services = [
      {
        agent_db_id: agents[0].id,
        created_at: "2026-09-07T08:00:00.000Z",
        endpoint: "https://agent.example/a2a",
        id: "44444444-4444-4444-8444-444444444444",
        metadata: { categories: ["Grid Trading"] },
        service_type: "A2A",
        version: "1.0",
      },
    ];
    const agentRequest = {
      eq(column: string, value: unknown) {
        calls.push({ column, operation: "eq", value });
        return agentRequest;
      },
      gt(column: string, value: unknown) {
        calls.push({ column, operation: "gt", value });
        return agentRequest;
      },
      async limit(value: number) {
        calls.push({ operation: "limit", value });
        return { data: agents, error: null };
      },
      order(column: string, options: unknown) {
        calls.push({ column, operation: "order-agents", options });
        return agentRequest;
      },
      select(columns: string) {
        calls.push({ columns, operation: "select-agents" });
        return agentRequest;
      },
    };
    let serviceOrderCalls = 0;
    const serviceRequest = {
      in(column: string, value: unknown) {
        calls.push({ column, operation: "in", value });
        return serviceRequest;
      },
      order(column: string, options: unknown) {
        serviceOrderCalls += 1;
        calls.push({ column, operation: "order-services", options });
        return serviceOrderCalls === 1
          ? serviceRequest
          : Promise.resolve({ data: services, error: null });
      },
      select(columns: string) {
        calls.push({ columns, operation: "select-services" });
        return serviceRequest;
      },
    };
    const client = {
      from(table: string) {
        calls.push({ operation: "from", table });
        return table === "agents" ? agentRequest : serviceRequest;
      },
      async rpc() {
        throw new Error("Candidate paging must not use the slow aggregation RPC.");
      },
    } as unknown as SupabaseClient<Database>;

    const candidates = await createCategoryRepository(client).listCandidatePage(
      56,
      "11111111-1111-4111-8111-111111111111",
      25,
    );

    assert.equal(candidates.length, 2);
    assert.equal(candidates[0]?.agentId, "301");
    assert.equal(
      candidates[0]?.sourceObservedAt,
      "2026-09-07T07:55:00.000Z",
    );
    assert.deepEqual(candidates[0]?.services, [
      {
        endpoint: "https://agent.example/a2a",
        metadata: { categories: ["Grid Trading"] },
        serviceType: "A2A",
        version: "1.0",
      },
    ]);
    assert.equal(
      candidates[1]?.sourceObservedAt,
      "2026-09-07T08:01:00.000Z",
    );
    assert.deepEqual(candidates[1]?.services, []);
    assert.ok(
      calls.some(
        (call) =>
          JSON.stringify(call) ===
          JSON.stringify({
            column: "id",
            operation: "gt",
            value: "11111111-1111-4111-8111-111111111111",
          }),
      ),
    );
    assert.ok(
      calls.some(
        (call) =>
          typeof call === "object" &&
          call !== null &&
          "operation" in call &&
          call.operation === "in",
      ),
    );
  });

  it("bootstraps an empty shortlist when the legacy safe-update function is blocked", async () => {
    const inserted: unknown[] = [];
    const client = {
      from(table: string) {
        assert.equal(table, "agent_category_shortlist");
        return {
          async insert(records: unknown[]) {
            inserted.push(...records);
            return { data: null, error: null };
          },
          async select() {
            return { count: 0, data: null, error: null };
          },
        };
      },
      async rpc(name: string) {
        assert.equal(name, "replace_agent_category_shortlist");
        return {
          data: null,
          error: {
            code: "21000",
            details: null,
            hint: null,
            message: "DELETE requires a WHERE clause",
          },
        };
      },
    } as unknown as SupabaseClient<Database>;
    const record = {
      agent_db_id: "22222222-2222-4222-8222-222222222222",
      category: "grid-trading",
      rationale: "Source-backed test candidate.",
      selected_at: "2026-09-07T08:00:00.000Z",
      selection_version: "test-only",
      shortlist_rank: 1,
    };

    await createCategoryRepository(client).replaceShortlist([record]);

    assert.deepEqual(inserted, [record]);
  });
});
