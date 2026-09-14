import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260914103000_prioritize_sift_score_v2_evidence.sql",
  import.meta.url,
);

describe("Sift Score v2 evidence queues", () => {
  it("prioritizes due second and third conclusive observations", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /health\.check_count between 1 and 2/i);
    assert.match(sql, /health\.status in \('online', 'degraded', 'offline'\)/i);
    assert.match(sql, /health\.last_checked_at <= p_stale_before/i);
    assert.match(sql, /limit \(select row_limit from bounds\)/i);
  });

  it("recalculates retired scores only when current independent evidence exists", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /p_score_version text default 'sift-evidence-v2\.0\.0'/i);
    assert.match(
      sql,
      /from public\.agent_scores as score[\s\S]+inner join current_signals as signal/i,
    );
    assert.match(sql, /score\.score_version <> p_score_version/i);
  });

  it("keeps both queues bounded, read-only and server-only", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.doesNotMatch(sql, /insert\s+into|update\s+public\.|delete\s+from/i);
    assert.match(
      sql,
      /revoke all on function public\.health_check_candidates[\s\S]+to service_role/i,
    );
    assert.match(
      sql,
      /revoke all on function public\.score_recalculation_candidates[\s\S]+to service_role/i,
    );
  });
});
