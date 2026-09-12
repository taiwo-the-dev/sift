import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260912180000_add_indexed_discovery_projection.sql",
  import.meta.url,
);

describe("indexed discovery projection migration", () => {
  it("builds a protected projection from canonical evidence", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /create table public\.agent_discovery_documents/i);
    assert.match(sql, /references public\.agents\(id\) on delete cascade/i);
    assert.match(sql, /public\.discovery_display_rating/i);
    assert.match(sql, /from public\.agent_services/i);
    assert.match(sql, /from public\.agent_category_evidence/i);
    assert.match(sql, /left join public\.agent_scores/i);
    assert.match(sql, /left join public\.agent_health/i);
    assert.match(sql, /enable row level security/i);
    assert.match(sql, /from public, anon, authenticated/i);
  });

  it("indexes every public discovery decision without counting all matches", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /agent_discovery_chain_recent_idx/i);
    assert.match(sql, /agent_discovery_chain_rating_idx/i);
    assert.match(sql, /agent_discovery_chain_sift_score_desc_idx/i);
    assert.match(sql, /agent_discovery_chain_services_idx/i);
    assert.match(sql, /agent_discovery_chain_health_idx/i);
    assert.match(sql, /agent_discovery_chain_access_idx/i);
    assert.match(sql, /using gin \(categories\)/i);
    assert.match(sql, /using gin \(search_document\)/i);
    assert.match(sql, /analyze public\.agent_discovery_documents/i);
    assert.match(sql, /limit v_page_size \+ 1/i);
    assert.doesNotMatch(sql, /count\(\*\) over \([^)]+partition/i);
  });

  it("keeps the projection current after source evidence changes", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    for (const trigger of [
      "refresh_discovery_after_agent_write",
      "refresh_discovery_after_service_write",
      "refresh_discovery_after_category_write",
      "refresh_discovery_after_health_write",
      "refresh_discovery_after_score_write",
    ]) {
      assert.match(sql, new RegExp(trigger));
    }
    assert.match(sql, /on conflict \(agent_db_id\) do update/i);
    assert.match(sql, /refresh_agent_discovery_documents\(null\)/i);
    assert.match(sql, /lock table[\s\S]+in share mode/i);
  });

  it("routes the advanced search through the projection and enriches only its page", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /from public\.agent_discovery_documents as document/i);
    assert.match(sql, /document\.search_document @@ v_search_query/i);
    assert.match(sql, /document\.categories && v_categories/i);
    assert.match(sql, /document\.display_rating >= 80/i);
    assert.match(sql, /from page_keys[\s\S]+inner join public\.agents/i);
    assert.match(sql, /set plan_cache_mode = 'force_custom_plan'/i);
    for (const wrapper of [
      "search_agents",
      "search_agents_with_health",
      "search_ready_agents",
    ]) {
      assert.match(
        sql,
        new RegExp(
          `create or replace function public\\.${wrapper}\\([\\s\\S]+from public\\.search_agents_advanced`,
          "i",
        ),
      );
    }
  });

  it("does not seed or alter canonical agent evidence", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.doesNotMatch(sql, /insert\s+into\s+public\.agents/i);
    assert.doesNotMatch(sql, /update\s+public\.agents/i);
    assert.doesNotMatch(sql, /delete\s+from\s+public\.agents/i);
    assert.doesNotMatch(sql, /insert\s+into\s+public\.agent_scores/i);
    assert.doesNotMatch(sql, /insert\s+into\s+public\.agent_health/i);
  });
});
