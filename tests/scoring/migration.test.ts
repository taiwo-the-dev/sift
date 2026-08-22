import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260822130000_add_health_scoring_provenance.sql",
  import.meta.url,
);

describe("M6 health and scoring migration", () => {
  it("adds auditable health, score, and reputation provenance", async () => {
    const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

    for (const column of [
      "service_type",
      "checked_endpoint",
      "endpoint_hash",
      "outcome",
      "check_count",
      "success_count",
      "evidence_snapshot",
      "source_freshness",
      "source_observed_at",
    ]) {
      assert.match(sql, new RegExp(`add column ${column}`));
    }

    assert.match(sql, /alter column sift_score drop not null/);
    assert.match(sql, /reputation_score between 0 and 100/);
    assert.match(sql, /success_count <= check_count/);
  });

  it("defines bounded server-only health and recalculation queues", async () => {
    const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

    assert.match(sql, /create function public\.health_check_candidates/);
    assert.match(sql, /create function public\.score_recalculation_candidates/);
    assert.match(sql, /create function public\.featured_agent_candidates/);
    assert.match(sql, /limit least\(greatest\(coalesce\(p_limit, 20\), 1\), 50\)/);
    assert.match(sql, /limit least\(greatest\(coalesce\(p_limit, 200\), 1\), 500\)/);
    assert.match(sql, /revoke execute[\s\S]*from public, anon, authenticated/);
    assert.match(sql, /grant execute[\s\S]*to service_role/);
    assert.match(sql, /sc\.confidence >= 0\.6/);
    assert.match(sql, /h\.status = 'online'/);
    assert.match(sql, /h\.outcome = 'success'/);
  });

  it("requeues only missing, changed, or version-stale score rows", async () => {
    const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

    assert.match(sql, /sc\.agent_db_id is null/);
    assert.match(sql, /sc\.score_version <> p_score_version/);
    assert.match(sql, /> sc\.calculated_at/);
    assert.match(sql, /h\.last_checked_at <= p_stale_before/);
    assert.match(sql, /h\.last_checked_at asc nulls first/);
    assert.match(sql, /agent-card\\\.json\/\?\$/);
    assert.match(sql, /h\.last_checked_at <= now\(\) - interval '24 hours'/);
    assert.match(sql, /a\.metadata_verified_at <= now\(\) - interval '30 days'/);
    assert.match(sql, /r\.source_observed_at <= now\(\) - interval '180 days'/);
  });

  it("contains no seed or fabricated catalogue data", async () => {
    const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

    assert.doesNotMatch(sql, /insert\s+into/);
    assert.doesNotMatch(sql, /generate_series/);
  });
});
