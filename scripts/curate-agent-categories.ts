import { loadEnvConfig } from "@next/env";

import {
  CATEGORY_SHORTLIST_VERSION,
  curatedMainnetAgents,
} from "@/features/categories/shortlist";
import { bnbNetworkDefinitions } from "@/lib/indexer/config";

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const [
    { createAgentRepository },
    { createAgentServiceRepository },
    { createCategoryRepository, mapCategoryEvidenceRecord },
  ] = await Promise.all([
    import("@/lib/db/agent-repository"),
    import("@/lib/db/agent-service-repository"),
    import("@/lib/db/category-repository"),
  ]);
  const agents = createAgentRepository();
  const services = createAgentServiceRepository();
  const categories = createCategoryRepository();
  const registryAddress = bnbNetworkDefinitions["bsc-mainnet"].registryAddress;
  const selectedAt = new Date().toISOString();
  const rows = [];

  for (const reference of curatedMainnetAgents) {
    const agent = await agents.findByIdentity({
      agentId: reference.agentId,
      chainId: 56,
      registryAddress,
    });

    if (!agent || agent.metadata_status !== "valid" || !agent.description) {
      throw new Error(
        `Mainnet agent #${reference.agentId} no longer meets the validated metadata shortlist bar.`,
      );
    }

    const [declaredServices, evidenceRecords] = await Promise.all([
      services.listByAgent(agent.id),
      categories.listEvidence([agent.id]),
    ]);
    const hasHttpsService = declaredServices.some(
      (service) => service.endpoint?.startsWith("https://"),
    );
    const matchingEvidence = evidenceRecords
      .map(mapCategoryEvidenceRecord)
      .find((evidence) => evidence.category === reference.category);

    if (!hasHttpsService || !matchingEvidence) {
      throw new Error(
        `Mainnet agent #${reference.agentId} lacks a declared HTTPS service or current ${reference.category} evidence.`,
      );
    }

    rows.push({
      agent_db_id: agent.id,
      category: reference.category,
      rationale: reference.rationale,
      selected_at: selectedAt,
      selection_version: CATEGORY_SHORTLIST_VERSION,
      shortlist_rank: reference.rank,
    });
  }

  await categories.replaceShortlist(rows);
  process.stdout.write(
    `${JSON.stringify({
      count: rows.length,
      event: "category_shortlist_complete",
      selectedAt,
      selectionVersion: CATEGORY_SHORTLIST_VERSION,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown curation failure.";
  process.stderr.write(`[FAIL] ${message}\n`);
  process.exitCode = 1;
});
