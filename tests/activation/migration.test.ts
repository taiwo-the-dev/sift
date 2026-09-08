import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const path = new URL(
  "../../supabase/migrations/20260908120000_add_agent_activation_evidence.sql",
  import.meta.url,
);

describe("M22 activation evidence migration", () => {
  it("stores checked service evidence and keeps the queue server-only", async () => {
    const sql = (await readFile(path, "utf8")).toLowerCase();
    assert.match(sql, /availability_last_success_at/);
    assert.match(sql, /capability_summary jsonb/);
    assert.match(sql, /activation_check_candidates/);
    assert.match(sql, /grant execute[\s\S]*to service_role/);
    assert.match(sql, /revoke all[\s\S]*from public, anon, authenticated/);
    assert.match(sql, /a\.metadata_status = 'valid'/);
    assert.match(sql, /a\.active is not false/);
  });

  it("does not seed agents or manufacture successful evidence", async () => {
    const sql = (await readFile(path, "utf8")).toLowerCase();
    assert.doesNotMatch(sql, /insert\s+into\s+public\.agents/);
    assert.doesNotMatch(sql, /set\s+availability_status\s*=\s*'available'/);
  });
});
