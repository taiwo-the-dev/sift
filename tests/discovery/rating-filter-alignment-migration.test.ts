import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260912150000_align_discovery_rating_filter.sql",
  import.meta.url,
);

describe("discovery rating filter alignment migration", () => {
  it("uses the same evidence order as the agent-card rating", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /when \(p_score\)\.sift_score is not null/i);
    assert.match(sql, /reputation_component is not null/i);
    assert.match(sql, /availability_component is not null/i);
    assert.match(sql, /when \(p_agent\)\.metadata_status <> 'valid' then/i);
    assert.match(sql, /p_unique_service_types/i);
    assert.match(sql, /p_has_endpoint/i);
    assert.match(sql, /p_has_version/i);
  });

  it("applies the displayed rating to filters without persisting it", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /discovery_display_rating\(agent, score/i);
    assert.match(sql, /cardinality\(v_score_bands\) > 0/i);
    assert.match(sql, /__sift_persisted_score__/i);
    assert.doesNotMatch(sql, /insert\s+into\s+public\.agent_scores/i);
    assert.doesNotMatch(sql, /update\s+public\.agent_scores/i);
  });

  it("keeps both database functions private to the server role", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(
      sql,
      /revoke all on function public\.discovery_display_rating[\s\S]+from public, anon, authenticated/i,
    );
    assert.match(
      sql,
      /grant execute on function public\.discovery_display_rating[\s\S]+to service_role/i,
    );
    assert.match(sql, /set plan_cache_mode = 'force_custom_plan'/i);
  });
});
