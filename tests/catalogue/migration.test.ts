import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const migration = readFileSync(
  fileURLToPath(
    new URL(
      "../../supabase/migrations/20260825090000_add_mainnet_catalogue_provenance.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

describe("M13 catalogue migration", () => {
  it("adds source transaction provenance and independent progress evidence", () => {
    assert.match(migration, /registration_transaction_hash text/);
    assert.match(migration, /registration_log_index bigint/);
    assert.match(migration, /confirmed_head bigint/);
  });

  it("defaults catalogue reads to chain 56 and allowlists both BSC networks", () => {
    assert.match(migration, /p_chain_ids bigint\[\] default array\[56\]/);
    assert.match(migration, /where chain_id in \(56, 97\)/);
    assert.match(migration, /ranked\.chain_id = any\(request\.chain_ids\)/);
  });

  it("contains no seed or relabelling statements", () => {
    assert.doesNotMatch(migration, /insert\s+into\s+public\./i);
    assert.doesNotMatch(migration, /update\s+public\./i);
  });
});
