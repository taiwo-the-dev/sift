import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const path = new URL(
  "../../supabase/migrations/20260909170000_enable_confirmed_mcp_actions.sql",
  import.meta.url,
);

describe("confirmed MCP action migration", () => {
  it("promotes only previously inspected MCP tool lists", async () => {
    const sql = (await readFile(path, "utf8")).toLowerCase();
    assert.match(sql, /activation_method = 'mcp'/);
    assert.match(sql, /availability_failure_code = 'no-read-only-tools'/);
    assert.match(sql, /availability_checked_at is not null/);
    assert.match(sql, /jsonb_array_length\(capability_summary -> 'tools'\) > 0/);
  });

  it("keeps the checker bounded and server-only", async () => {
    const sql = (await readFile(path, "utf8")).toLowerCase();
    assert.match(sql, /partition by agent\.chain_id, service\.activation_method/);
    assert.match(sql, /least\(coalesce\(p_limit, 25\), 100\)/);
    assert.match(sql, /grant execute[\s\S]*to service_role/);
    assert.match(sql, /revoke all[\s\S]*from public, anon, authenticated/);
  });
});
