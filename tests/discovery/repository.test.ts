import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "../../lib/db/database.types";
import { createDiscoveryRepository } from "../../lib/db/discovery-repository";
import { parseDiscoverySearchParams } from "../../features/discovery/query";

type SearchAgentRow =
  Database["public"]["Functions"]["search_agents"]["Returns"][number];

const fixtureRows: readonly SearchAgentRow[] = [
  {
    active: null,
    agent_db_id: "11111111-1111-4111-8111-111111111111",
    agent_id: "104",
    category_evidence: [
      {
        category: "grid-trading",
        confidence: 0.65,
        facts: [],
        matchedTerms: ["grid strategy"],
        observedAt: "2026-08-22T09:00:00.000Z",
        ruleVersion: "sift-category-taxonomy-v1.0.0",
        source: "deterministic-rule",
      },
    ],
    category_source: "deterministic-rule",
    chain_id: 97,
    description: "Fixture grid strategy metadata",
    has_more: true,
    image_url: null,
    last_synced_at: "2026-08-22T09:00:00.000Z",
    metadata_status: "valid",
    name: "Fixture Grid Agent",
    owner_address: "0x1111111111111111111111111111111111111111",
    registered_at: "2026-08-20T09:00:00.000Z",
    registered_block: 120,
    registry_address: "0x8004a818bfb912233c491871b3d84c89a494bd9e",
    relevance: 0.8,
    resolved_categories: ["grid-trading"],
    result_page: 2,
    services: [{ serviceType: "A2A", version: "1.0" }],
    x402_supported: null,
  },
  {
    active: null,
    agent_db_id: "22222222-2222-4222-8222-222222222222",
    agent_id: "103",
    category_source: null,
    category_evidence: [],
    chain_id: 97,
    description: null,
    has_more: true,
    image_url: null,
    last_synced_at: "2026-08-22T09:00:00.000Z",
    metadata_status: "invalid",
    name: null,
    owner_address: null,
    registered_at: "2026-08-19T09:00:00.000Z",
    registered_block: 119,
    registry_address: "0x8004a818bfb912233c491871b3d84c89a494bd9e",
    relevance: 0.4,
    resolved_categories: [],
    result_page: 2,
    services: [],
    x402_supported: null,
  },
];

const noEvidence = {
  listHealth: async () => [],
  listScores: async () => [],
};

describe("discovery repository integration boundary", () => {
  it("uses a bounded indexed table path for the unfiltered recent catalogue", async () => {
    const calls: unknown[] = [];
    const recentRow = {
      active: true,
      agent_category_evidence: [
        {
          category: "grid-trading",
          confidence: 0.65,
          evidence: { matchedTerms: ["grid strategy"] },
          facts: [],
          observed_at: "2026-09-05T09:00:00.000Z",
          rule_version: "sift-category-taxonomy-v1.0.0",
          source: "deterministic-rule",
        },
      ],
      agent_id: "205",
      agent_services: [{ service_type: "A2A", version: "1.0" }],
      chain_id: 56,
      description: "Fixture latest registration",
      id: "33333333-3333-4333-8333-333333333333",
      image_url: null,
      last_synced_at: "2026-09-05T09:00:00.000Z",
      metadata_status: "valid",
      name: "Fixture Latest Agent",
      owner_address: "0x3333333333333333333333333333333333333333",
      registered_at: "2026-09-05T08:59:00.000Z",
      registered_block: 205,
      registry_address: "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432",
      x402_supported: false,
    };
    const request = {
      eq(column: string, value: unknown) {
        calls.push({ column, operation: "eq", value });
        return request;
      },
      in(column: string, value: unknown) {
        calls.push({ column, operation: "in", value });
        return request;
      },
      order(column: string, options: unknown) {
        calls.push({ column, operation: "order", options });
        return request;
      },
      async range(from: number, to: number) {
        calls.push({ from, operation: "range", to });
        return { data: [recentRow], error: null };
      },
      select() {
        calls.push({ operation: "select" });
        return request;
      },
    };
    const client = {
      from(table: string) {
        calls.push({ operation: "from", table });
        return request;
      },
      async rpc() {
        throw new Error("The recent fast path must not call search_agents.");
      },
    } as unknown as SupabaseClient<Database>;

    const result = await createDiscoveryRepository(
      client,
      noEvidence,
    ).listRecentlyRegistered();

    assert.equal(result.agents.length, 1);
    assert.equal(result.agents[0]?.agentId, "205");
    assert.deepEqual(result.agents[0]?.categories, ["grid-trading"]);
    assert.deepEqual(result.agents[0]?.services, [
      { serviceType: "A2A", version: "1.0" },
    ]);
    assert.deepEqual(calls.slice(0, 3), [
      { operation: "from", table: "agents" },
      { operation: "select" },
      { column: "chain_id", operation: "eq", value: 56 },
    ]);
    assert.deepEqual(calls.at(-1), {
      from: 0,
      operation: "range",
      to: 12,
    });
  });

  it("passes validated combined filters to the database function", async () => {
    const calls: unknown[] = [];
    const client = {
      async rpc(name: string, parameters: unknown) {
        calls.push({ name, parameters });
        return { data: fixtureRows, error: null };
      },
    } as unknown as SupabaseClient<Database>;
    const query = parseDiscoverySearchParams({
      category: "grid-trading",
      metadata: ["valid", "invalid"],
      page: "2",
      q: "automate grid trading",
      size: "12",
      sort: "profile-first",
    });

    const result = await createDiscoveryRepository(client, noEvidence).search(query);

    assert.deepEqual(calls, [
      {
        name: "search_agents",
        parameters: {
          p_categories: ["grid-trading"],
          p_chain_ids: [56],
          p_metadata_statuses: ["valid", "invalid"],
          p_page: 2,
          p_page_size: 12,
          p_search_terms: ["automate", "grid", "trading"],
          p_sort: "profile-first",
        },
      },
    ]);
    assert.equal(result.hasNextPage, true);
    assert.equal(result.totalCount, null);
    assert.equal(result.page, 2);
  });

  it("preserves stable database order and maps service/category fixtures", async () => {
    const client = {
      async rpc() {
        return { data: fixtureRows, error: null };
      },
    } as unknown as SupabaseClient<Database>;
    const query = parseDiscoverySearchParams({ q: "grid" });

    const result = await createDiscoveryRepository(client, noEvidence).search(query);

    assert.deepEqual(
      result.agents.map((agent) => agent.agentId),
      ["104", "103"],
    );
    assert.deepEqual(result.agents[0]?.categories, ["grid-trading"]);
    assert.deepEqual(result.agents[0]?.services, [
      { serviceType: "A2A", version: "1.0" },
    ]);
    assert.equal(result.agents[1]?.name, null);
  });
});
