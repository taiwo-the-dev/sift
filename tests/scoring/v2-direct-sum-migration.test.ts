import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260914120000_sum_sift_score_component_points.sql",
  import.meta.url,
);

describe("Sift Score v2.1 direct-sum migration", () => {
  it("exposes only the direct-sum formula through discovery", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /score_version = 'sift-evidence-v2\.1\.0'/i);
    assert.match(sql, /set sift_score = null/i);
    assert.doesNotMatch(sql, /delete\s+from\s+public\.agent_scores/i);
  });

  it("keeps the projection guard private and refreshes planner statistics", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(
      sql,
      /revoke all on function public\.enforce_current_discovery_sift_score\(\)[\s\S]+from public, anon, authenticated/i,
    );
    assert.match(sql, /analyze public\.agent_discovery_documents/i);
  });
});
