import { loadEnvConfig } from "@next/env";

import type { Database } from "@/lib/db/database.types";

const requiredTables = [
  "agents",
  "agent_category_evidence",
  "agent_category_shortlist",
  "agent_external_evidence",
  "agent_services",
  "agent_health",
  "agent_reputation",
  "agent_scores",
  "sync_state",
  "jobs",
  "job_transactions",
  "job_activity",
  "dashboard_wallet_challenges",
  "dashboard_sessions",
] as const satisfies readonly (keyof Database["public"]["Tables"])[];

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const { getSupabaseServerClient } = await import("@/lib/db/client");
  const client = getSupabaseServerClient();
  const tableCounts: Record<string, number> = {};

  for (const table of requiredTables) {
    const { count, error } = await client
      .from(table)
      .select("*", { count: "exact", head: true });

    if (error || count === null) {
      throw new Error(
        `Hosted schema verification failed for ${table}${error?.code ? ` (${error.code})` : ""}.`,
      );
    }

    tableCounts[table] = count;
  }

  const [checkpointResult, agentResult, healthResult, scoreResult] =
    await Promise.all([
      client
        .from("sync_state")
        .select("chain_id,last_synced_block,updated_at")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from("agents")
        .select("agent_id,chain_id,last_synced_at,metadata_status")
        .order("last_synced_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from("agent_health")
        .select("last_checked_at,status")
        .order("last_checked_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      client
        .from("agent_scores")
        .select("calculated_at,score_version,sift_score")
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const freshnessResults = [
    ["sync checkpoint", checkpointResult],
    ["agent catalogue", agentResult],
    ["health evidence", healthResult],
    ["score evidence", scoreResult],
  ] as const;

  for (const [label, result] of freshnessResults) {
    if (result.error) {
      throw new Error(
        `Hosted ${label} verification failed${result.error.code ? ` (${result.error.code})` : ""}.`,
      );
    }
  }

  const { buildCategoryCoverageReport } = await import(
    "@/features/categories/coverage"
  );
  const { createCategoryRepository } = await import(
    "@/lib/db/category-repository"
  );
  const categoryCoverage = buildCategoryCoverageReport(
    await createCategoryRepository(client).listCoverage(56),
    new Date().toISOString(),
  );

  if (categoryCoverage.status !== "pass") {
    throw new Error(
      `Hosted category coverage is blocked: ${categoryCoverage.issues.join(" ")}`,
    );
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        event: "release_data_verified",
        categoryCoverage,
        freshness: {
          agent: agentResult.data,
          health: healthResult.data,
          score: scoreResult.data,
          sync: checkpointResult.data,
        },
        tables: tableCounts,
      },
      null,
      2,
    )}\n`,
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : "Unknown hosted release-data verification failure.";
  process.stderr.write(`[FAIL] ${message}\n`);
  process.exitCode = 1;
});
