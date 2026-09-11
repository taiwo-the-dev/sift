import { loadEnvConfig } from "@next/env";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  CATEGORY_TAXONOMY_VERSION,
  classifyAgentCategories,
} from "@/features/categories/taxonomy";

const BATCH_SIZE = 500;
const MIN_BATCH_SIZE = 25;
const MAX_ATTEMPTS = 6;
type BackfillCheckpoint = Readonly<{
  after: string;
  chainId: 56 | 97;
  classified: number;
  matched: number;
  ruleVersion: typeof CATEGORY_TAXONOMY_VERSION;
}>;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function resolveChainId(network: string | undefined): 56 | 97 {
  if (!network || network === "bsc-mainnet") return 56;
  if (network === "bsc-testnet") return 97;
  throw new TypeError("BNB_NETWORK must be bsc-mainnet or bsc-testnet.");
}

function checkpointPath(chainId: 56 | 97): string {
  return join(
    process.cwd(),
    ".sift",
    chainId === 56
      ? "category-classification-checkpoint.json"
      : "category-classification-checkpoint-97.json",
  );
}

async function loadCheckpoint(
  path: string,
  chainId: 56 | 97,
): Promise<BackfillCheckpoint | null> {
  try {
    const value: unknown = JSON.parse(await readFile(path, "utf8"));
    if (
      typeof value !== "object" ||
      value === null ||
      !("after" in value) ||
      typeof value.after !== "string" ||
      !uuidPattern.test(value.after) ||
      !("chainId" in value) ||
      value.chainId !== chainId ||
      !("classified" in value) ||
      typeof value.classified !== "number" ||
      !Number.isSafeInteger(value.classified) ||
      value.classified < 0 ||
      !("matched" in value) ||
      typeof value.matched !== "number" ||
      !Number.isSafeInteger(value.matched) ||
      value.matched < 0 ||
      !("ruleVersion" in value) ||
      typeof value.ruleVersion !== "string"
    ) {
      throw new TypeError("The local category backfill checkpoint is invalid.");
    }

    return value.ruleVersion === CATEGORY_TAXONOMY_VERSION
      ? (value as BackfillCheckpoint)
      : null;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

async function saveCheckpoint(
  path: string,
  checkpoint: BackfillCheckpoint,
): Promise<void> {
  const temporaryPath = `${path}.tmp`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(checkpoint)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporaryPath, path);
}

function safeErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const chainId = resolveChainId(process.env.BNB_NETWORK);
  const path = checkpointPath(chainId);
  const { createCategoryRepository } = await import(
    "@/lib/db/category-repository"
  );
  const repository = createCategoryRepository();
  const checkpoint = await loadCheckpoint(path, chainId);
  let after: string | null = checkpoint?.after ?? null;
  let classified = checkpoint?.classified ?? 0;
  let matched = checkpoint?.matched ?? 0;
  let batchSize = BATCH_SIZE;
  let successfulReducedBatches = 0;

  if (checkpoint) {
    process.stdout.write(
      `${JSON.stringify({
        classified,
        event: "category_classification_resumed",
        matchedEvidence: matched,
        ruleVersion: CATEGORY_TAXONOMY_VERSION,
      })}\n`,
    );
  }

  while (true) {
    let candidates: Awaited<ReturnType<typeof repository.listCandidatePage>> | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        candidates = await repository.listCandidatePage(chainId, after, batchSize);
        break;
      } catch (error) {
        if (attempt === MAX_ATTEMPTS) throw error;
        batchSize = Math.max(MIN_BATCH_SIZE, Math.floor(batchSize / 2));
        successfulReducedBatches = 0;
        const retryDelayMs = Math.min(8_000, 500 * 2 ** (attempt - 1));
        process.stderr.write(
          `${JSON.stringify({
            attempt,
            batchSize,
            errorName: safeErrorName(error),
            event: "category_classification_retry",
            retryDelayMs,
          })}\n`,
        );
        await wait(retryDelayMs);
      }
    }

    if (!candidates) {
      throw new Error("Category candidate loading ended without a result.");
    }
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
    if (!after) throw new Error("Category candidate page had no final cursor.");
    await saveCheckpoint(path, {
      after,
      chainId,
      classified,
      matched,
      ruleVersion: CATEGORY_TAXONOMY_VERSION,
    });

    if (batchSize < BATCH_SIZE) {
      successfulReducedBatches += 1;
      if (successfulReducedBatches >= 10) {
        batchSize = Math.min(BATCH_SIZE, batchSize * 2);
        successfulReducedBatches = 0;
      }
    }

    process.stdout.write(
      `${JSON.stringify({
        classified,
        event: "category_classification_progress",
        matchedEvidence: matched,
        ruleVersion: CATEGORY_TAXONOMY_VERSION,
      })}\n`,
    );
  }

  await rm(path, { force: true });

  process.stdout.write(
    `${JSON.stringify({
      chainId,
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
