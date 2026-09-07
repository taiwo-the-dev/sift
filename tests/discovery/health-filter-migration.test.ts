import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260908103000_add_discovery_health_filter.sql",
  import.meta.url,
);

describe("discovery health filter migration", () => {
  it("allowlists health states and treats a missing observation as unknown", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /create function public\.search_agents_with_health/i);
    assert.match(sql, /'online', 'degraded', 'offline', 'unknown'/i);
    assert.match(
      sql,
      /coalesce\(matched_health\.status, ''unknown''\) = any\(\$7\)/i,
    );
    assert.match(sql, /agent_health_status_agent_idx/i);
  });

  it("keeps the function private to the server-side service role", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(
      sql,
      /revoke execute on function public\.search_agents_with_health[\s\S]+from public, anon, authenticated/i,
    );
    assert.match(
      sql,
      /grant execute on function public\.search_agents_with_health[\s\S]+to service_role/i,
    );
  });
});
