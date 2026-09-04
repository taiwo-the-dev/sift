import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260904150000_optimize_catalogue_status.sql",
  import.meta.url,
);

describe("catalogue status performance migration", () => {
  it("indexes the bounded latest-sync lookup without modifying catalogue data", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /create index agents_catalogue_latest_sync_idx/);
    assert.match(sql, /create index agents_category_classification_idx/);
    assert.match(sql, /last_synced_at desc nulls last/);
    assert.match(sql, /create or replace function public\.search_agents/);
    assert.match(sql, /from public\.agent_category_evidence/);
    assert.match(sql, /from public\.agent_services/);
    assert.match(sql, /limit \$5 \+ 1/);
    assert.doesNotMatch(sql, /(?:insert|update|delete)\s+(?:into|from)?\s*public\./i);
  });
});
