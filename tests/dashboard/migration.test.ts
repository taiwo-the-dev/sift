import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260824100000_add_dashboard_wallet_sessions.sql",
  import.meta.url,
);

describe("M10 dashboard session migration", () => {
  it("creates expiring challenges and sessions without product data", async () => {
    const sql = await readFile(migrationUrl, "utf8");
    assert.match(sql, /create table public\.dashboard_wallet_challenges/i);
    assert.match(sql, /create table public\.dashboard_sessions/i);
    assert.match(sql, /expires_at > issued_at/i);
    assert.match(sql, /expires_at > created_at/i);
    assert.doesNotMatch(sql, /insert\s+into\s+public\./i);
  });

  it("denies browser roles and reserves access for the server role", async () => {
    const sql = await readFile(migrationUrl, "utf8");
    for (const table of ["dashboard_wallet_challenges", "dashboard_sessions"]) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
      assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, "i"));
      assert.match(sql, new RegExp(`grant all on table public\\.${table} to service_role`, "i"));
    }
  });
});
