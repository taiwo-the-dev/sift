import { loadEnvConfig } from "@next/env";

import {
  CATEGORY_TAXONOMY_VERSION,
  classifyAgentCategories,
} from "@/features/categories/taxonomy";

const BATCH_SIZE = 250;

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const { createCategoryRepository } = await import(
    "@/lib/db/category-repository"
  );
  const repository = createCategoryRepository();
  let after: string | null = null;
  let classified = 0;
  let matched = 0;

  while (true) {
    const candidates = await repository.listCandidatePage(56, after, BATCH_SIZE);
    if (candidates.length === 0) break;

    const records = candidates.map((candidate) => {
      const evidence = classifyAgentCategories({
        declaredCategories: candidate.declaredCategory
          ? [candidate.declaredCategory]
          : [],
        description: candidate.description,
        name: candidate.name,
        observedAt: candidate.sourceObservedAt,
        services: candidate.services,
      });
      matched += evidence.length;
      return { agentDbId: candidate.agentDbId, evidence };
    });

    await repository.replaceEvidenceBatch(records);
    classified += candidates.length;
    after = candidates.at(-1)?.agentDbId ?? null;

    process.stdout.write(
      `${JSON.stringify({
        classified,
        event: "category_classification_progress",
        matchedEvidence: matched,
        ruleVersion: CATEGORY_TAXONOMY_VERSION,
      })}\n`,
    );
  }

  process.stdout.write(
    `${JSON.stringify({
      chainId: 56,
      classified,
      event: "category_classification_complete",
      matchedEvidence: matched,
      ruleVersion: CATEGORY_TAXONOMY_VERSION,
    })}\n`,
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown classification failure.";
  process.stderr.write(`[FAIL] ${message}\n`);
  process.exitCode = 1;
});
