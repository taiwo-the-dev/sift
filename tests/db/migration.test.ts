import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const migrationPath = fileURLToPath(
  new URL(
    "../../supabase/migrations/20260818000000_create_agent_catalog.sql",
    import.meta.url,
  ),
);
const migration = readFileSync(migrationPath, "utf8");

const tableNames = [
  "agents",
  "agent_services",
  "agent_health",
  "agent_reputation",
  "agent_scores",
  "sync_state",
] as const;

describe("M2 database migration", () => {
  it("creates exactly the six in-scope persistence tables", () => {
    const createdTables = Array.from(
      migration.matchAll(/create table public\.([a-z_]+)\s*\(/g),
      (match) => match[1],
    );

    assert.deepEqual(createdTables, tableNames);
  });

  it("enables RLS and denies browser roles on every table", () => {
    for (const tableName of tableNames) {
      assert.match(
        migration,
        new RegExp(
          `alter table public\\.${tableName} enable row level security;`,
        ),
      );
      assert.match(
        migration,
        new RegExp(
          `revoke all on table public\\.${tableName} from anon, authenticated;`,
        ),
      );
    }
  });

  it("contains no seeded or fabricated records", () => {
    assert.doesNotMatch(migration, /insert\s+into\s+public\./i);
    assert.doesNotMatch(migration, /copy\s+public\./i);
  });

  it("protects agent identity and sync checkpoint uniqueness", () => {
    assert.match(migration, /agents_chain_registry_agent_key unique/);
    assert.match(migration, /primary key \(chain_id, registry_address\)/);
  });
});
