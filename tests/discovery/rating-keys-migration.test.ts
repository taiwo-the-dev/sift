import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260912190000_add_bounded_rating_discovery_keys.sql",
  import.meta.url,
);

describe("bounded rating discovery keys migration", () => {
  it("builds only allowlisted rating predicates over the indexed projection", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /create or replace function public\.search_agent_rating_keys/i);
    assert.match(sql, /from public\.agent_discovery_documents as document/i);
    assert.match(sql, /document\.display_rating >= 80/i);
    assert.match(sql, /document\.display_rating >= 60/i);
    assert.match(sql, /document\.display_rating >= 40/i);
    assert.match(sql, /document\.display_rating < 40/i);
    assert.match(sql, /limit \$6 \+ 1/i);
    assert.match(sql, /offset \$7/i);
  });

  it("supports every existing filter and sort without interpolating user input", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /document\.categories && \$3/i);
    assert.match(sql, /document\.health_status = any\(\$4\)/i);
    assert.match(sql, /document\.search_document @@ \$5/i);
    assert.match(sql, /document\.registered_at >= now\(\) - interval ''30 days''/i);
    assert.match(sql, /document\.access_last_success_at >= now\(\) - interval ''24 hours''/i);
    for (const sort of [
      "relevance",
      "recent",
      "oldest",
      "profile-first",
      "name-asc",
      "name-desc",
      "score-desc",
      "score-asc",
      "available-first",
      "health-recent",
      "services-desc",
    ]) {
      assert.match(sql, new RegExp(`'${sort}'`));
    }
    assert.doesNotMatch(sql, /format\([^)]*p_(?:search|sort|category)/i);
  });

  it("keeps the key function server-only and does not alter agent evidence", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(
      sql,
      /revoke all on function public\.search_agent_rating_keys[\s\S]+from public, anon, authenticated/i,
    );
    assert.match(
      sql,
      /grant execute on function public\.search_agent_rating_keys[\s\S]+to service_role/i,
    );
    assert.doesNotMatch(sql, /insert\s+into\s+public\./i);
    assert.doesNotMatch(sql, /update\s+public\./i);
    assert.doesNotMatch(sql, /delete\s+from\s+public\./i);
  });
});
