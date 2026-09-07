import { loadEnvConfig } from "@next/env";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { calculateSiftScore, SIFT_SCORE_VERSION } from "@/features/scoring/formula";
import { createLogger, sanitizeError } from "@/lib/indexer/logger";

const BATCH_SIZE = 500;
const MIN_BATCH_SIZE = 25;
const MAX_ATTEMPTS = 6;
const CHECKPOINT_PATH = join(
  process.cwd(),
  ".sift",
  "score-backfill-checkpoint.json",
);

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BackfillCheckpoint = Readonly<{
  after: string;
  formulaVersion: typeof SIFT_SCORE_VERSION;
  published: number;
  scored: number;
  withheld: number;
}>;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function loadCheckpoint(): Promise<BackfillCheckpoint | null> {
  try {
    const value: unknown = JSON.parse(await readFile(CHECKPOINT_PATH, "utf8"));

    if (
      typeof value !== "object" ||
      value === null ||
      !("after" in value) ||
      typeof value.after !== "string" ||
      !uuidPattern.test(value.after) ||
      !("formulaVersion" in value) ||
      value.formulaVersion !== SIFT_SCORE_VERSION ||
      !("scored" in value) ||
      typeof value.scored !== "number" ||
      !Number.isSafeInteger(value.scored) ||
      value.scored < 0 ||
      !("published" in value) ||
      typeof value.published !== "number" ||
      !Number.isSafeInteger(value.published) ||
      value.published < 0 ||
      !("withheld" in value) ||
      typeof value.withheld !== "number" ||
      !Number.isSafeInteger(value.withheld) ||
      value.withheld < 0
    ) {
      throw new TypeError("The local score backfill checkpoint is invalid.");
    }

    return value as BackfillCheckpoint;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function saveCheckpoint(checkpoint: BackfillCheckpoint): Promise<void> {
  const temporaryPath = `${CHECKPOINT_PATH}.tmp`;
  await mkdir(dirname(CHECKPOINT_PATH), { recursive: true });
  await writeFile(temporaryPath, `${JSON.stringify(checkpoint)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  await rename(temporaryPath, CHECKPOINT_PATH);
}

function safeErrorName(error: unknown): string {
  return error instanceof Error ? error.name : "UnknownError";
}

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const logger = createLogger();
  const { createScoreRepository } = await import("@/lib/db/score-repository");
  const repository = createScoreRepository();

  const checkpoint = await loadCheckpoint();
  let after: string | null = checkpoint?.after ?? null;
  let scored = checkpoint?.scored ?? 0;
  let published = checkpoint?.published ?? 0;
  let withheld = checkpoint?.withheld ?? 0;
  let batchSize = BATCH_SIZE;
  let successfulReducedBatches = 0;

  logger.info(
    checkpoint ? "score_backfill_resumed" : "score_backfill_started",
    { formulaVersion: SIFT_SCORE_VERSION, published, scored, withheld },
  );

  while (true) {
    let page: Awaited<ReturnType<typeof repository.listCandidatePage>> | null =
      null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        page = await repository.listCandidatePage(after, batchSize);
        break;
      } catch (error) {
        if (attempt === MAX_ATTEMPTS) throw error;
        batchSize = Math.max(MIN_BATCH_SIZE, Math.floor(batchSize / 2));
        successfulReducedBatches = 0;
        const retryDelayMs = Math.min(8_000, 500 * 2 ** (attempt - 1));
        logger.warn("score_backfill_retry", {
          attempt,
          batchSize,
          errorName: safeErrorName(error),
          retryDelayMs,
        });
        await wait(retryDelayMs);
      }
    }

    if (!page) {
      throw new Error("Score backfill page loading ended without a result.");
    }
    if (page.length === 0) break;

    const calculatedAt = new Date().toISOString();
    const scores = page.map((candidate) => ({
      agentDbId: candidate.agentDbId,
      assessment: calculateSiftScore(candidate, calculatedAt),
      calculatedAt,
    }));

    await repository.save(scores);

    scored += scores.length;
    published += scores.filter((entry) => entry.assessment.score !== null).length;
    withheld += scores.filter((entry) => entry.assessment.score === null).length;
    after = page.at(-1)?.agentDbId ?? null;
    if (!after) throw new Error("Score backfill page had no final cursor.");

    await saveCheckpoint({
      after,
      formulaVersion: SIFT_SCORE_VERSION,
      published,
      scored,
      withheld,
    });

    if (batchSize < BATCH_SIZE) {
      successfulReducedBatches += 1;
      if (successfulReducedBatches >= 10) {
        batchSize = Math.min(BATCH_SIZE, batchSize * 2);
        successfulReducedBatches = 0;
      }
    }

    logger.info("score_backfill_progress", {
      formulaVersion: SIFT_SCORE_VERSION,
      published,
      scored,
      withheld,
    });
  }

  await rm(CHECKPOINT_PATH, { force: true });

  logger.info("score_backfill_complete", {
    formulaVersion: SIFT_SCORE_VERSION,
    published,
    scored,
    withheld,
  });
}

main().catch((error: unknown) => {
  const logger = createLogger((line) => process.stderr.write(`${line}\n`));
  logger.error("score_backfill_failed", sanitizeError(error));
  process.exitCode = 1;
});
