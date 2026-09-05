import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260905100000_optimize_category_text_search.sql",
  import.meta.url,
);

describe("combined category and text search migration", () => {
  it("narrows broad text searches to materialized category candidates", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /category_candidates as materialized/i);
    assert.match(sql, /matched_candidates as materialized/i);
    assert.match(sql, /evidence\.category = any\(v_categories\)/i);
    assert.match(sql, /searchable_service\.agent_db_id = candidate_agent\.id/i);
    assert.match(sql, /limit v_page_size \+ 1/i);
  });

  it("keeps the existing indexed plan for other query shapes", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /rename to search_agents_general/i);
    assert.match(sql, /from public\.search_agents_general/i);
    assert.match(sql, /grant execute on function public\.search_agents\(/i);
    assert.doesNotMatch(
      sql,
      /(?:insert|update|delete)\s+(?:into|from)?\s*public\./i,
    );
  });
});
