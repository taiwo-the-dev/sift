import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationPath = new URL(
  "../../supabase/migrations/20260909010000_prioritize_verified_actionable_agents.sql",
  import.meta.url,
);

describe("verified actionable-agent discovery migration", () => {
  it("excludes unchecked declarations from Available results", async () => {
    const sql = (await readFile(migrationPath, "utf8")).toLowerCase();

    assert.match(sql, /available_service\.endpoint is not null/);
    assert.match(sql, /available_service\.availability_status = 'available'/);
    assert.match(
      sql,
      /available_service\.availability_last_success_at >= now\(\) - interval '24 hours'/,
    );
    assert.doesNotMatch(
      sql,
      /or available_service\.availability_status = 'unchecked'/,
    );
  });

  it("puts protected hiring and direct task methods first", async () => {
    const sql = (await readFile(migrationPath, "utf8")).toLowerCase();

    assert.match(
      sql,
      /when 'erc8183' then 0\s+when 'a2a' then 1\s+when 'mcp' then 2\s+when 'x402' then 3/,
    );
    assert.match(sql, /order by\s+matching\.access_priority/);
    assert.match(sql, /order by\s+page_keys\.access_priority/);
  });

  it("keeps proven routes fresh and rotates checks across methods", async () => {
    const sql = (await readFile(migrationPath, "utf8")).toLowerCase();

    assert.match(
      sql,
      /availability_status in \('available', 'degraded'\) then 0/,
    );
    assert.match(sql, /partition by service\.activation_method/);
    assert.doesNotMatch(sql, /insert\s+into/);
  });
});
