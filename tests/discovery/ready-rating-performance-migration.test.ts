import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260912170000_optimize_ready_rating_filter.sql",
  import.meta.url,
);

describe("combined availability and rating performance migration", () => {
  it("narrows recently verified action routes before service rating work", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /ready_agent_ids as materialized/i);
    assert.match(sql, /availability_status = ''available''/i);
    assert.match(
      sql,
      /availability_last_success_at >= now\(\) - interval ''24 hours''/i,
    );
    assert.match(sql, /activation_method in \(''erc8183'', ''a2a'', ''mcp'', ''x402''\)/i);
    assert.match(sql, /service\.agent_db_id in \([\s\S]+from ready_agent_ids/i);
  });

  it("preserves the rating helper, custom plan, and server-only boundary", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /public\.discovery_display_rating\(agent, score/i);
    assert.match(sql, /set plan_cache_mode = 'force_custom_plan'/i);
    assert.match(
      sql,
      /revoke all on function public\.search_agents_advanced[\s\S]+from public, anon, authenticated/i,
    );
    assert.match(
      sql,
      /grant execute on function public\.search_agents_advanced[\s\S]+to service_role/i,
    );
  });

  it("does not manufacture or mutate catalogue evidence", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.doesNotMatch(sql, /insert\s+into\s+public\./i);
    assert.doesNotMatch(sql, /update\s+public\./i);
    assert.doesNotMatch(sql, /delete\s+from\s+public\./i);
  });
});
