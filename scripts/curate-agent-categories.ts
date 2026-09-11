import { loadEnvConfig } from "@next/env";

import {
  CATEGORY_SHORTLIST_VERSION,
  curatedMainnetAgents,
} from "@/features/categories/shortlist";
import {
  CATEGORY_TAXONOMY_VERSION,
  classifyAgentCategories,
} from "@/features/categories/taxonomy";
import { bnbNetworkDefinitions } from "@/lib/indexer/config";

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const [
    { createAgentRepository },
    { createAgentServiceRepository },
    { createCategoryRepository },
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
  const evidenceUpdates = [];

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

    const declaredServices = await services.listByAgent(agent.id);
    const hasHttpsService = declaredServices.some(
      (service) => service.endpoint?.startsWith("https://"),
    );
    const currentEvidence = classifyAgentCategories({
      declaredCategories: agent.category ? [agent.category] : [],
      description: agent.description,
      name: agent.name,
      observedAt:
        agent.metadata_verified_at ?? agent.last_synced_at ?? agent.updated_at,
      services: declaredServices.map((service) => ({
        endpoint: service.endpoint,
        metadata: service.metadata,
        serviceType: service.service_type,
        version: service.version,
      })),
    });
    const matchingEvidence = currentEvidence.find(
      (evidence) =>
        evidence.category === reference.category &&
        evidence.ruleVersion === CATEGORY_TAXONOMY_VERSION,
    );

    if (!hasHttpsService || !matchingEvidence) {
      throw new Error(
        `Mainnet agent #${reference.agentId} lacks a declared HTTPS service or current ${reference.category} evidence.`,
      );
    }

    evidenceUpdates.push({ agentDbId: agent.id, evidence: currentEvidence });

    rows.push({
      agent_db_id: agent.id,
      category: reference.category,
      rationale: reference.rationale,
      selected_at: selectedAt,
      selection_version: CATEGORY_SHORTLIST_VERSION,
      shortlist_rank: reference.rank,
    });
  }

  // Recompute all candidates first so a stale or mismatched identity fails
  // before either the evidence set or shortlist is changed.
  await categories.replaceEvidenceBatch(evidenceUpdates);
  await categories.replaceShortlist(rows);
  process.stdout.write(
    `${JSON.stringify({
      count: rows.length,
      event: "category_shortlist_complete",
      selectedAt,
      selectionVersion: CATEGORY_SHORTLIST_VERSION,
      taxonomyVersion: CATEGORY_TAXONOMY_VERSION,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown curation failure.";
  const cause =
    error instanceof Error && "cause" in error &&
    typeof error.cause === "object" && error.cause !== null
      ? error.cause as Readonly<Record<string, unknown>>
      : null;
  const code = typeof cause?.code === "string" ? cause.code : null;
  const causeMessage =
    typeof cause?.message === "string" ? cause.message : null;
  const context = [code, causeMessage].filter(Boolean).join(": ");
  process.stderr.write(`[FAIL] ${message}${context ? ` (${context})` : ""}\n`);
  process.exitCode = 1;
});
