import { loadEnvConfig } from "@next/env";

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const [
    { createCategoryRepository, mapCategoryEvidenceRecord },
    { createConfigured8004ScanClient },
  ] = await Promise.all([
    import("@/lib/db/category-repository"),
    import("@/lib/integrations/8004scan"),
  ]);
  const repository = createCategoryRepository();
  const shortlist = await repository.listShortlist();
  const agentIds = shortlist.map((row) => row.agent_db_id);
  const [agents, evidenceRecords] = await Promise.all([
    repository.listAgentRecords(agentIds),
    repository.listEvidence(agentIds),
  ]);
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  const evidenceById = new Map<string, ReturnType<typeof mapCategoryEvidenceRecord>[]>();

  for (const record of evidenceRecords) {
    const values = evidenceById.get(record.agent_db_id) ?? [];
    values.push(mapCategoryEvidenceRecord(record));
    evidenceById.set(record.agent_db_id, values);
  }

  const client = createConfigured8004ScanClient();
  const outcomes: Record<string, number> = {};

  for (const shortlisted of shortlist) {
    const agent = agentById.get(shortlisted.agent_db_id);
    if (!agent) throw new Error("A shortlisted agent no longer exists.");
    const result = await client.crossCheck({
      agentDbId: agent.id,
      agentId: agent.agent_id,
      categories: (evidenceById.get(agent.id) ?? []).map((item) => item.category),
      chainId: agent.chain_id,
      ownerAddress: agent.owner_address,
      registryAddress: agent.registry_address,
    });
    outcomes[result.availability] = (outcomes[result.availability] ?? 0) + 1;

    process.stdout.write(
      `${JSON.stringify({
        agentId: agent.agent_id,
        availability: result.availability,
        category: shortlisted.category,
        conflictFields: result.conflictFields,
        event: "category_external_cross_check",
        observedAt: result.observedAt,
        source: result.source,
      })}\n`,
    );
  }

  process.stdout.write(
    `${JSON.stringify({
      apiKeyConfigured: Boolean(process.env.SIFT_8004SCAN_API_KEY?.trim()),
      checked: shortlist.length,
      event: "category_external_cross_check_complete",
      outcomes,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown enrichment failure.";
  process.stderr.write(`[FAIL] ${message}\n`);
  process.exitCode = 1;
});
