import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const migrationPath = fileURLToPath(
  new URL(
    "../../supabase/migrations/20260822090000_add_agent_discovery_search.sql",
    import.meta.url,
  ),
);
const migration = readFileSync(migrationPath, "utf8");

describe("M4 discovery migration", () => {
  it("adds service search support without creating or seeding catalogue data", () => {
    assert.match(migration, /create index agent_services_search_idx/);
    assert.match(migration, /create function public\.search_agents/);
    assert.doesNotMatch(migration, /insert\s+into\s+public\./i);
    assert.doesNotMatch(migration, /update\s+public\./i);
  });

  it("keeps the search function server-only and bounded", () => {
    assert.match(migration, /security invoker/);
    assert.match(
      migration,
      /revoke execute[\s\S]+from public, anon, authenticated;/,
    );
    assert.match(migration, /grant execute[\s\S]+to service_role;/);
    assert.match(migration, /least\(coalesce\(p_page_size, 12\), 36\)/);
  });

  it("uses deterministic filters and stable ordering", () => {
    assert.match(migration, /ranked\.discovery_categories && request\.categories/);
    assert.match(migration, /ranked\.metadata_status = any/);
    assert.match(migration, /filtered\.chain_id asc/);
    assert.match(migration, /filtered\.registry_address asc/);
    assert.match(migration, /length\(filtered\.agent_id\) asc/);
  });
});
