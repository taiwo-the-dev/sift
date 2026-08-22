import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const migrationPath = fileURLToPath(
  new URL(
    "../../supabase/migrations/20260822111500_add_metadata_verification_time.sql",
    import.meta.url,
  ),
);
const migration = readFileSync(migrationPath, "utf8");

describe("M5 metadata verification migration", () => {
  it("adds a successful verification timestamp without creating profile data", () => {
    assert.match(
      migration,
      /add column metadata_verified_at timestamptz/,
    );
    assert.doesNotMatch(migration, /insert\s+into/i);
    assert.doesNotMatch(migration, /create\s+table/i);
  });

  it("backfills only currently valid indexed metadata", () => {
    assert.match(migration, /set metadata_verified_at = last_synced_at/);
    assert.match(migration, /where metadata_status = 'valid'/);
  });
});
