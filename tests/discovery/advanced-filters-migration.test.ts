import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260912120000_add_advanced_discovery_filters.sql",
  import.meta.url,
);

describe("advanced discovery filters migration", () => {
  it("uses persisted evidence for rating, registration, health, and availability", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /create or replace function public\.search_agents_advanced/i);
    assert.match(sql, /score\.sift_score is not null/i);
    assert.match(sql, /agent\.registered_at >= now\(\) - interval '30 days'/i);
    assert.match(sql, /coalesce\(health\.status, 'unknown'\)/i);
    assert.match(sql, /availability_last_success_at >= now\(\) - interval '24 hours'/i);
  });

  it("allowlists all new sorts and keeps the RPC private", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    for (const sort of [
      "score-desc",
      "score-asc",
      "available-first",
      "health-recent",
      "services-desc",
    ]) {
      assert.match(sql, new RegExp(`'${sort}'`));
    }
    assert.match(
      sql,
      /revoke all on function public\.search_agents_advanced[\s\S]+from public, anon, authenticated/i,
    );
    assert.match(
      sql,
      /grant execute on function public\.search_agents_advanced[\s\S]+to service_role/i,
    );
    assert.doesNotMatch(sql, /insert\s+into\s+public\.agents/i);
  });
});
