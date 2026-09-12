import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260912210000_add_bounded_discovery_keys.sql",
  import.meta.url,
);

describe("bounded advanced discovery keys migration", () => {
  it("creates a key-only function that permits an empty rating filter", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /create or replace function public\.search_agent_discovery_keys/i);
    assert.match(sql, /if cardinality\(v_score_bands\) > 0 then/i);
    assert.match(
      sql,
      /position\('if cardinality\(v_score_bands\) = 0 then' in v_updated_source\) > 0/i,
    );
  });

  it("inherits the narrow allowlisted plan and stays server-only", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /position\('select document\.\*' in v_source\) > 0/i);
    assert.match(sql, /document\.chain_id = 56/i);
    assert.match(
      sql,
      /revoke all on function public\.search_agent_discovery_keys[\s\S]+from public, anon, authenticated/i,
    );
    assert.match(
      sql,
      /grant execute on function public\.search_agent_discovery_keys[\s\S]+to service_role/i,
    );
  });

  it("does not manufacture or mutate catalogue evidence", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.doesNotMatch(sql, /insert\s+into\s+public\./i);
    assert.doesNotMatch(sql, /update\s+public\./i);
    assert.doesNotMatch(sql, /delete\s+from\s+public\./i);
  });
});
