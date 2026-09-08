import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const path = new URL(
  "../../supabase/migrations/20260908130000_ready_filter_declared_fallback.sql",
  import.meta.url,
);

describe("ready filter declared-readiness fallback migration", () => {
  it("accepts an unprobed declared activation service", async () => {
    const sql = (await readFile(path, "utf8")).toLowerCase();

    assert.match(sql, /create or replace function public\.search_ready_agents/);
    assert.match(sql, /or available_service\.availability_status = 'unchecked'/);
    // A fresh successful probe is still honoured.
    assert.match(
      sql,
      /availability_last_success_at\s*\n?\s*>= now\(\) - interval '24 hours'/,
    );
    // The declared method still has to be a supported activation method.
    assert.match(
      sql,
      /available_service\.activation_method in \('erc8183', 'a2a', 'mcp', 'x402'\)/,
    );
  });

  it("does not weaken the agent-level gates or seed data", async () => {
    const sql = (await readFile(path, "utf8")).toLowerCase();

    assert.match(sql, /a\.metadata_status = 'valid'/);
    assert.match(sql, /a\.active is not false/);
    assert.doesNotMatch(sql, /insert\s+into/);
    assert.doesNotMatch(sql, /update\s+public\.agent_services\s+set/);
  });
});
