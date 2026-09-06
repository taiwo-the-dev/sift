import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260906120000_add_discovery_sort_options.sql",
  import.meta.url,
);

describe("discovery sort options migration", () => {
  it("supports descending names and verified profiles in both search plans", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /create or replace function public\.search_agents_general/i);
    assert.match(sql, /create or replace function public\.search_agents\(/i);
    assert.equal((sql.match(/'profile-first'/g) ?? []).length, 9);
    assert.equal((sql.match(/'name-desc'/g) ?? []).length, 6);
    assert.match(sql, /page_candidates\.metadata_status = ''valid''/i);
    assert.match(sql, /matched_candidates\.normalized_name end desc/i);
  });

  it("adds a supporting index without changing catalogue records", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /agents_verified_profile_registered_block_idx/i);
    assert.doesNotMatch(
      sql,
      /(?:insert|update|delete)\s+(?:into|from)?\s*public\./i,
    );
  });
});
