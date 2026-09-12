import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260912200000_optimize_bounded_rating_keys.sql",
  import.meta.url,
);

describe("bounded rating-key performance migration", () => {
  it("uses a covering recent-rating index and narrow candidate rows", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(
      sql,
      /create index if not exists agent_discovery_chain_recent_rating_cover_idx/i,
    );
    assert.match(sql, /include \(display_rating\)/i);
    assert.match(sql, /document\.agent_db_id/i);
    assert.match(sql, /document\.search_document/i);
    assert.match(sql, /select document\.\*/i);
    assert.match(sql, /position\('select document\.\*' in v_updated_source\) > 0/i);
  });

  it("uses only fixed validated BSC chain predicates", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /document\.chain_id = 56/i);
    assert.match(sql, /document\.chain_id = 97/i);
    assert.match(sql, /document\.chain_id in \(56, 97\)/i);
    assert.doesNotMatch(sql, /v_predicates.*\|\|.*p_chain_ids/i);
  });

  it("does not alter canonical agent or evidence records", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.doesNotMatch(sql, /insert\s+into\s+public\./i);
    assert.doesNotMatch(sql, /update\s+public\./i);
    assert.doesNotMatch(sql, /delete\s+from\s+public\./i);
  });
});
