import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { CATEGORY_TAXONOMY_VERSION } from "../../features/categories/taxonomy";

const migrationUrl = new URL(
  "../../supabase/migrations/20260908100000_version_category_coverage_report.sql",
  import.meta.url,
);

describe("versioned category coverage migration", () => {
  it("counts only current taxonomy evidence without changing product data", async () => {
    const sql = (await readFile(migrationUrl, "utf8")).toLowerCase();

    assert.match(
      sql,
      /create or replace function public\.category_coverage_report/,
    );
    assert.match(sql, new RegExp(`evidence\\.rule_version = '${CATEGORY_TAXONOMY_VERSION}'`));
    assert.doesNotMatch(sql, /insert\s+into/);
    assert.doesNotMatch(sql, /update\s+public\./);
    assert.doesNotMatch(sql, /delete\s+from/);
  });
});
