import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260912143000_optimize_advanced_discovery_sorting.sql",
  import.meta.url,
);

describe("advanced discovery sorting performance migration", () => {
  it("removes full-catalogue materialization and uses a sort-specific plan", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /matching as not materialized/i);
    assert.match(sql, /page_candidates as not materialized/i);
    assert.match(sql, /page_keys as not materialized/i);
    assert.match(sql, /plan_cache_mode = 'force_custom_plan'/i);
  });

  it("adds evidence sort indexes without modifying catalogue records", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /agent_health \(last_checked_at desc nulls last, agent_db_id\)/i);
    assert.match(sql, /agent_services[\s\S]+availability_status[\s\S]+activation_method/i);
    assert.doesNotMatch(sql, /insert\s+into\s+public\.agents/i);
    assert.doesNotMatch(sql, /update\s+public\.agents/i);
    assert.doesNotMatch(sql, /delete\s+from\s+public\.agents/i);
  });
});
