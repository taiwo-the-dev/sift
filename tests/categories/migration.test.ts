import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260903090000_add_category_evidence.sql",
  import.meta.url,
);
const shortlistFixMigrationUrl = new URL(
  "../../supabase/migrations/20260907120000_fix_category_shortlist_replacement.sql",
  import.meta.url,
);

describe("M14 category evidence migration", () => {
  it("creates protected evidence stores and server-only report functions", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    for (const table of [
      "agent_category_evidence",
      "agent_category_shortlist",
      "agent_external_evidence",
    ]) {
      assert.match(sql, new RegExp(`create table public\\.${table}`));
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`));
      assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`));
    }

    assert.match(sql, /create function public\.category_coverage_report/);
    assert.match(sql, /create function public\.category_classification_candidates/);
    assert.match(sql, /create function public\.replace_agent_category_evidence/);
    assert.match(sql, /create function public\.replace_agent_category_shortlist/);
    assert.match(sql, /returns void\s+language plpgsql/);
    assert.doesNotMatch(sql, /when assembled\.classification_document/);
  });

  it("keeps catalogue search narrow before loading page details", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /create index agents_chain_registered_block_idx/);
    assert.match(sql, /text_matches as materialized/);
    assert.match(sql, /category_matches as materialized/);
    assert.match(sql, /filtered as \(\s*select\s+a\.id,/);
    assert.match(sql, /page_candidates as materialized/);
    assert.match(sql, /limit \(select page_size \+ 1 from request\)/);
    assert.match(sql, /page_rows as \(\s*select\s+a\.\*,/);
    assert.doesNotMatch(sql, /filtered as \(\s*select\s+a\.\*,/);
    assert.doesNotMatch(sql, /result_bounds as/);
  });

  it("keeps shortlist replacement atomic and compatible with safe updates", async () => {
    const sql = await readFile(shortlistFixMigrationUrl, "utf8");

    assert.match(
      sql,
      /create or replace function public\.replace_agent_category_shortlist/,
    );
    assert.match(
      sql,
      /delete from public\.agent_category_shortlist\s+where category in/,
    );
    assert.match(
      sql,
      /revoke execute on function public\.replace_agent_category_shortlist\(jsonb\)/,
    );
    assert.match(
      sql,
      /grant execute on function public\.replace_agent_category_shortlist\(jsonb\)\s+to service_role/,
    );
  });
});
