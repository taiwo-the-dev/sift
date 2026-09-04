import { loadEnvConfig } from "@next/env";

import { buildCategoryCoverageReport } from "@/features/categories/coverage";

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const { createCategoryRepository } = await import("@/lib/db/category-repository");
  const observedAt = new Date().toISOString();
  const coverage = await createCategoryRepository().listCoverage(56);
  const report = buildCategoryCoverageReport(coverage, observedAt);

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status === "blocked") process.exitCode = 1;
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown coverage report failure.";
  process.stderr.write(`[FAIL] ${message}\n`);
  process.exitCode = 1;
});
