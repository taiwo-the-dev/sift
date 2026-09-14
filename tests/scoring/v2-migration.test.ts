import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260914100000_add_sift_score_v2.sql",
  import.meta.url,
);

describe("Sift Score v2 migration", () => {
  it("keeps retired formula values out of discovery without deleting audit rows", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /score_version = 'sift-evidence-v2\.0\.0'/i);
    assert.match(sql, /new\.sift_score := v_current_score/i);
    assert.match(sql, /set sift_score = null/i);
    assert.doesNotMatch(sql, /delete\s+from\s+public\.agent_scores/i);
    assert.doesNotMatch(sql, /update\s+public\.agent_scores/i);
  });

  it("uses publishable Sift Scores instead of profile display ratings", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /'document\.display_rating'/i);
    assert.match(sql, /'document\.sift_score'/i);
    assert.match(sql, /agent_discovery_chain_recent_score_cover_idx/i);
  });

  it("keeps every discovery function server-only", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    for (const functionName of [
      "search_agents_advanced",
      "search_agent_rating_keys",
      "search_agent_discovery_keys",
    ]) {
      assert.match(
        sql,
        new RegExp(
          `revoke all on function public\\.${functionName}[\\s\\S]+to service_role`,
          "i",
        ),
      );
    }
  });
});
