import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

const migrationUrl = new URL(
  "../../supabase/migrations/20260823090000_add_hiring_jobs.sql",
  import.meta.url,
);

describe("M9 hiring migration", () => {
  it("adds constrained job, transaction, and activity persistence", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    assert.match(sql, /create table public\.jobs/i);
    assert.match(sql, /create table public\.job_transactions/i);
    assert.match(sql, /create table public\.job_activity/i);
    assert.match(sql, /idempotency_key uuid not null unique/i);
    assert.match(sql, /unique \(job_db_id, step\)/i);
    assert.match(sql, /chain_id = 97/i);
    assert.match(sql, /budget_base_units::numeric <= maximum_spend_base_units::numeric/i);
    assert.match(sql, /create function public\.record_hiring_verification/i);
    assert.match(sql, /language plpgsql\s+security invoker/i);
  });

  it("keeps browser roles out of service-role hiring records", async () => {
    const sql = await readFile(migrationUrl, "utf8");

    for (const table of ["jobs", "job_transactions", "job_activity"]) {
      assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
      assert.match(sql, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`, "i"));
      assert.match(sql, new RegExp(`grant all on table public\\.${table} to service_role`, "i"));
    }
    assert.match(sql, /revoke all on function public\.record_hiring_verification[\s\S]+from public, anon, authenticated/i);
    assert.match(sql, /grant execute on function public\.record_hiring_verification[\s\S]+to service_role/i);
  });
});
