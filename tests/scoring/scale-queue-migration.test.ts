import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260908090000_scale_score_recalculation_queue.sql",
  import.meta.url,
);

describe("score recalculation queue scaling migration", () => {
  it("replaces the queue with two independently bounded branches", async () => {
    const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

    assert.match(
      sql,
      /create or replace function public\.score_recalculation_candidates/,
    );
    assert.match(sql, /missing_or_stale as \(/);
    assert.match(sql, /changed_inputs as \(/);
    // Each branch carries its own bounded limit before the union.
    assert.equal(
      (sql.match(/limit \(select row_limit from bounds\)/g) ?? []).length,
      3,
    );
    // The per-row correlated aggregate over agent_services is gone; the
    // changed-service check is now an indexable exists() probe.
    assert.doesNotMatch(sql, /select max\(svc\.updated_at\)/);
    assert.doesNotMatch(sql, /order by[\s\S]*greatest\(/);
  });

  it("keeps the exact recalculation triggers and stays read-only", async () => {
    const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

    assert.match(sql, /sc\.agent_db_id is null/);
    assert.match(sql, /sc\.score_version <> p_score_version/);
    assert.match(sql, /svc\.updated_at > sc\.calculated_at/);
    assert.match(sql, /h\.last_checked_at <= now\(\) - interval '24 hours'/);
    assert.match(sql, /a\.metadata_verified_at <= now\(\) - interval '30 days'/);
    assert.match(sql, /r\.source_observed_at <= now\(\) - interval '180 days'/);
    assert.doesNotMatch(sql, /insert\s+into/);
    assert.doesNotMatch(sql, /generate_series/);
  });
});
