import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260912220000_optimize_discovery_decision_sorts.sql",
  import.meta.url,
);

describe("discovery decision-sort performance migration", () => {
  it("indexes the exact available and verified-profile sort keys", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /agent_discovery_chain_access_recent_idx/i);
    assert.match(sql, /access_last_success_at desc nulls last/i);
    assert.match(sql, /agent_discovery_chain_valid_profile_idx/i);
    assert.match(sql, /\(\(metadata_status = 'valid'\)\) desc/i);
  });

  it("removes the unindexable availability CASE from the bounded function", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /document\.access_last_success_at desc nulls last/i);
    assert.match(
      sql,
      /position\('when document\.erc8183_success_at >= now\(\)' in v_updated_source\) > 0/i,
    );
  });

  it("does not mutate agent or evidence records", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.doesNotMatch(sql, /insert\s+into\s+public\./i);
    assert.doesNotMatch(sql, /update\s+public\./i);
    assert.doesNotMatch(sql, /delete\s+from\s+public\./i);
  });
});
