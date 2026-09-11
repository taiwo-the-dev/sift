import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260908110000_enable_mainnet_hiring.sql",
  import.meta.url,
);

describe("BSC network hiring migration", () => {
  it("allows only chain 56 and 97 hiring and dashboard records", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /alter table public\.jobs[\s\S]+chain_id in \(56, 97\)/i);
    assert.match(
      sql,
      /alter table public\.dashboard_wallet_challenges[\s\S]+chain_id in \(56, 97\)/i,
    );
    assert.match(
      sql,
      /alter table public\.dashboard_sessions[\s\S]+chain_id in \(56, 97\)/i,
    );
    assert.doesNotMatch(sql, /disable row level security/i);
    assert.doesNotMatch(sql, /grant .+ to (?:anon|authenticated)/i);
  });
});
