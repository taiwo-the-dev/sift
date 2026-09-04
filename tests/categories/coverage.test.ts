import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCategoryCoverageReport } from "../../features/categories/coverage";
import { categorySlugs } from "../../features/categories/taxonomy";
import type { CategoryCoverage } from "../../lib/db/category-repository";

function row(category: CategoryCoverage["category"], count = 3): CategoryCoverage {
  return {
    activationAvailable: 0,
    category,
    externalCrossChecks: count,
    inventory: count,
    latestObservedAt: "2026-09-03T15:00:00.000Z",
    shortlistCount: count,
    validMetadata: count,
    withEndpoint: count,
    withHealth: 0,
    withImage: count,
    withReputation: 0,
    withScore: 0,
    withServices: count,
  };
}

describe("M14 coverage report", () => {
  it("passes only when each category meets the common shortlist and cross-check bar", () => {
    const report = buildCategoryCoverageReport(
      categorySlugs.map((category) => row(category)),
      "2026-09-03T16:00:00.000Z",
    );

    assert.equal(report.status, "pass");
    assert.equal(report.categories.length, 4);
    assert.equal(report.activationPolicy.mainnetWritesEnabled, false);
  });

  it("reports real gaps instead of filling missing categories", () => {
    const report = buildCategoryCoverageReport(
      [row("yield-optimisation", 2)],
      "2026-09-03T16:00:00.000Z",
    );

    assert.equal(report.status, "blocked");
    assert.ok(report.issues.some((issue) => issue.includes("grid-trading")));
    assert.equal(
      report.categories.find((item) => item.category === "grid-trading")?.inventory,
      0,
    );
  });
});
