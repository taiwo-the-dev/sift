import { loadEnvConfig } from "@next/env";

import { parseScoreRunConfig } from "@/features/scoring/config";
import { runScoreCalculation } from "@/features/scoring/run";
import { createScoreRepository } from "@/lib/db/score-repository";
import { createLogger, sanitizeError } from "@/lib/indexer/logger";

const MAXIMUM_BATCHES = 100;

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const config = parseScoreRunConfig(process.env);
  const logger = createLogger();
  const repository = createScoreRepository();
  let assessed = 0;
  let published = 0;
  let withheld = 0;

  logger.info("score_backfill_started", {
    batchLimit: config.batchLimit,
    maximumBatches: MAXIMUM_BATCHES,
  });

  for (let batch = 1; batch <= MAXIMUM_BATCHES; batch += 1) {
    const summary = await runScoreCalculation(config, { logger, repository });
    assessed += summary.assessed;
    published += summary.published;
    withheld += summary.withheld;

    logger.info("score_backfill_progress", {
      assessed,
      batch,
      published,
      withheld,
    });

    if (summary.assessed === 0) {
      logger.info("score_backfill_complete", {
        assessed,
        batches: batch,
        published,
        withheld,
      });
      return;
    }
  }

  throw new Error(
    `Score backfill stopped at its safety limit of ${MAXIMUM_BATCHES} batches. Re-run it to continue the idempotent queue.`,
  );
}

main().catch((error: unknown) => {
  const logger = createLogger((line) => process.stderr.write(`${line}\n`));
  logger.error("score_backfill_failed", sanitizeError(error));
  process.exitCode = 1;
});
