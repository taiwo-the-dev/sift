import { loadEnvConfig } from "@next/env";

import { parseScoreRunConfig } from "@/features/scoring/config";
import {
  MINIMUM_SCORE_EVIDENCE_WEIGHT,
  scoreComponentDefinitions,
  SIFT_SCORE_VERSION,
} from "@/features/scoring/formula";
import { runScoreCalculation } from "@/features/scoring/run";
import { createScoreRepository } from "@/lib/db/score-repository";
import {
  createLogger,
  sanitizeError,
} from "@/lib/indexer/logger";

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());
  const config = parseScoreRunConfig(process.env);
  const logger = createLogger();

  if (process.argv[2] === "smoke") {
    logger.info("score_calculation_smoke_complete", {
      batchLimit: config.batchLimit,
      formulaVersion: SIFT_SCORE_VERSION,
      minimumEvidenceWeight: MINIMUM_SCORE_EVIDENCE_WEIGHT,
      totalFormulaWeight: scoreComponentDefinitions.reduce(
        (total, component) => total + component.weight,
        0,
      ),
    });
    return;
  }

  if (process.argv[2] !== undefined) {
    throw new Error("Score command accepts only the optional smoke argument.");
  }

  await runScoreCalculation(config, {
    logger,
    repository: createScoreRepository(),
  });
}

main().catch((error: unknown) => {
  const logger = createLogger((line) => process.stderr.write(`${line}\n`));
  logger.error("score_calculation_failed", sanitizeError(error));
  process.exitCode = 1;
});
