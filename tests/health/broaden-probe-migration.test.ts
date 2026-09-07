import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260908093000_broaden_health_probe_targets.sql",
  import.meta.url,
);

describe("health probe target broadening migration", () => {
  it("queues any safe HTTPS a2a declaration without a path requirement", async () => {
    const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

    assert.match(
      sql,
      /create or replace function public\.health_check_candidates/,
    );
    assert.match(
      sql,
      /lower\(trim\(svc\.service_type\)\) in \('health', 'a2a'\)/,
    );
    // The old endpoint-path regex requirement for a2a is gone: an a2a row no
    // longer has to prove its endpoint ends in the discovery document path.
    assert.doesNotMatch(sql, /split_part\(svc\.endpoint/);
    assert.doesNotMatch(sql, /svc\.endpoint[\s\S]{0,40}agent-card/);
    // The score join is no longer part of the ordering. The query starts from
    // an indexed, materialized service subset instead of scanning all agents.
    assert.doesNotMatch(sql, /join public\.agent_scores/);
    assert.doesNotMatch(sql, /sc\.sift_score/);
    assert.match(sql, /agent_services_health_candidate_idx/);
    assert.match(sql, /eligible_agents as materialized/);
    assert.match(sql, /agent_category_shortlist/);
    assert.match(sql, /h\.last_checked_at asc nulls first/);
    assert.match(sql, /least\(greatest\(coalesce\(p_limit, 20\), 1\), 50\)/);
    assert.doesNotMatch(sql, /insert\s+into/);
  });
});
