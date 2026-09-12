import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260912230000_include_access_sort_key.sql",
  import.meta.url,
);

describe("bounded access sort-key migration", () => {
  it("adds the aggregate access timestamp to the narrow candidate", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /document\.access_last_success_at,/i);
    assert.match(sql, /document\.access_last_success_at desc nulls last/i);
    assert.match(sql, /create or replace function public\.search_agent_discovery_keys/i);
  });

  it("keeps the function server-only and evidence read-only", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /from public, anon, authenticated/i);
    assert.match(sql, /to service_role/i);
    assert.doesNotMatch(sql, /insert\s+into\s+public\./i);
    assert.doesNotMatch(sql, /update\s+public\./i);
    assert.doesNotMatch(sql, /delete\s+from\s+public\./i);
  });
});
