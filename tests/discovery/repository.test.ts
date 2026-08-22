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
    category_source: "deterministic-keyword",
    chain_id: 97,
    description: "Fixture grid strategy metadata",
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
    total_count: 13,
    x402_supported: null,
  },
  {
    active: null,
    agent_db_id: "22222222-2222-4222-8222-222222222222",
    agent_id: "103",
    category_source: null,
    chain_id: 97,
    description: null,
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
    total_count: 13,
    x402_supported: null,
  },
];

describe("discovery repository integration boundary", () => {
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
      sort: "recent",
    });

    const result = await createDiscoveryRepository(client).search(query);

    assert.deepEqual(calls, [
      {
        name: "search_agents",
        parameters: {
          p_categories: ["grid-trading"],
          p_metadata_statuses: ["valid", "invalid"],
          p_page: 2,
          p_page_size: 12,
          p_search_terms: ["automate", "grid", "trading"],
          p_sort: "recent",
        },
      },
    ]);
    assert.equal(result.totalCount, 13);
    assert.equal(result.page, 2);
  });

  it("preserves stable database order and maps service/category fixtures", async () => {
    const client = {
      async rpc() {
        return { data: fixtureRows, error: null };
      },
    } as unknown as SupabaseClient<Database>;
    const query = parseDiscoverySearchParams({ q: "grid" });

    const result = await createDiscoveryRepository(client).search(query);

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
