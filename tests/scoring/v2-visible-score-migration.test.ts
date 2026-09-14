import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationPath = new URL(
  "../../supabase/migrations/20260914130000_show_direct_sift_score_for_all_evidence.sql",
  import.meta.url,
);

describe("Sift Score v2.2 projection migration", () => {
  it("projects the six direct component sums and accepts v2.1 evidence", async () => {
    const sql = await readFile(migrationPath, "utf8");

    assert.match(sql, /reputation_component, 0\) \* 15/i);
    assert.match(sql, /reliability_component, 0\) \* 25/i);
    assert.match(sql, /availability_component, 0\) \* 20/i);
    assert.match(sql, /capability_component, 0\) \* 10/i);
    assert.match(sql, /track_record_component, 0\) \* 20/i);
    assert.match(sql, /metadata_component, 0\) \* 10/i);
    assert.match(sql, /sift-evidence-v2\.1\.0/i);
    assert.match(sql, /sift-evidence-v2\.2\.0/i);
  });

  it("queues every retired stored assessment for bounded recalculation", async () => {
    const sql = await readFile(migrationPath, "utf8");
    const versionBranch = sql.match(
      /version_mismatch as \([\s\S]*?\),\n  actionable_missing as/,
    )?.[0];

    assert.ok(versionBranch);
    assert.match(versionBranch, /score_version <> p_score_version/i);
    assert.doesNotMatch(versionBranch, /current_signals as signal/i);
    assert.match(sql, /least\(greatest\(coalesce\(p_limit, 200\), 1\), 500\)/i);
  });
});
