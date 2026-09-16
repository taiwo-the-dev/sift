import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260915120000_compact_catalogue_storage.sql",
  import.meta.url,
);
const transferScriptUrl = new URL(
  "../../scripts/transfer-compact-database.ts",
  import.meta.url,
);

describe("compact catalogue storage migration", () => {
  it("keeps one derived discovery row for every canonical agent", async () => {
    const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

    assert.match(sql, /create table public\.agent_discovery_documents/);
    assert.match(sql, /agent_db_id uuid primary key references public\.agents/);
    assert.match(sql, /from public\.agents as agent/);
    assert.match(sql, /select public\.refresh_agent_discovery_documents\(null\)/);
    assert.match(sql, /v_agent_count <> v_document_count/);
  });

  it("bounds indexed text and removes duplicated raw search indexes", async () => {
    const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

    assert.match(sql, /drop index if exists public\.agents_search_idx/);
    assert.match(sql, /drop index if exists public\.agent_services_search_idx/);
    assert.match(sql, /left\(agent\.description, 4096\)/);
    assert.match(sql, /left\([\s\S]+8192[\s\S]+\)\s*\)/);
    assert.match(sql, /using gin \(search_document\)/);
    assert.doesNotMatch(
      sql,
      /service\.endpoint,[\s\S]{0,100}service\.metadata::text/,
    );
  });

  it("uses the direct six-criterion Sift Score for every discovery row", async () => {
    const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

    assert.match(sql, /create or replace function public\.discovery_sift_score/);
    assert.match(sql, /reputation_component, 0\) \* 0\.15/);
    assert.match(sql, /reliability_component, 0\) \* 0\.25/);
    assert.match(sql, /availability_component, 0\) \* 0\.20/);
    assert.match(sql, /capability_component, 0\) \* 0\.10/);
    assert.match(sql, /track_record_component, 0\) \* 0\.20/);
    assert.match(sql, /metadata_component, 0\) \* 0\.10/);
    assert.match(sql, /sift_score numeric\(5, 2\) not null default 0/);
    assert.match(sql, /document\.sift_score >= 80/);
  });

  it("refreshes imported batches once per statement and keeps RPCs private", async () => {
    const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

    assert.match(sql, /referencing new table as new_rows/);
    assert.match(sql, /for each statement execute function/);
    assert.doesNotMatch(sql, /for each row execute function public\.refresh_discovery/);
    assert.match(
      sql,
      /revoke all on function public\.search_agent_discovery_keys[\s\S]+from public, anon, authenticated/,
    );
    assert.match(
      sql,
      /grant execute on function public\.search_agent_discovery_keys[\s\S]+to service_role/,
    );
  });

  it("copies canonical evidence but intentionally excludes expiring tokens", async () => {
    const script = await readFile(transferScriptUrl, "utf8");

    for (const table of [
      "agents",
      "agent_services",
      "agent_category_evidence",
      "agent_health",
      "agent_reputation",
      "agent_scores",
      "jobs",
      "job_transactions",
      "job_activity",
    ]) {
      assert.match(script, new RegExp(`table: [\"']${table}[\"']`));
    }

    assert.match(script, /skippedEphemeralTables/);
    assert.match(script, /dashboard_sessions/);
    assert.match(script, /mcp_action_authorizations/);
    assert.match(script, /Source and compact target must be different projects/);
  });
});
