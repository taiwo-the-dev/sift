import type { ScoreRunConfig } from "@/features/scoring/config";
import {
  calculateSiftScore,
  SIFT_SCORE_VERSION,
} from "@/features/scoring/formula";
import type { ScoreRepository } from "@/lib/db/score-repository";
import type { Logger } from "@/lib/indexer/logger";

export type ScoreRunSummary = Readonly<{
  assessed: number;
  published: number;
  withheld: number;
}>;

type ScoreRunDependencies = Readonly<{
  logger: Logger;
  now?: () => Date;
  repository: ScoreRepository;
}>;

export async function runScoreCalculation(
  config: ScoreRunConfig,
  dependencies: ScoreRunDependencies,
): Promise<ScoreRunSummary> {
  const now = dependencies.now ?? (() => new Date());
  const candidates = await dependencies.repository.listCandidates(
    config.batchLimit,
    SIFT_SCORE_VERSION,
  );
  const calculatedAt = now().toISOString();

  dependencies.logger.info("score_calculation_started", {
    candidates: candidates.length,
    formulaVersion: SIFT_SCORE_VERSION,
    limit: config.batchLimit,
  });

  const scores = candidates.map((candidate) => ({
    agentDbId: candidate.agentDbId,
    assessment: calculateSiftScore(candidate, calculatedAt),
    calculatedAt,
  }));

  await dependencies.repository.save(scores);

  const summary: ScoreRunSummary = {
    assessed: scores.length,
    published: scores.filter((score) => score.assessment.score !== null).length,
    withheld: scores.filter((score) => score.assessment.score === null).length,
  };

  dependencies.logger.info("score_calculation_complete", {
    ...summary,
    formulaVersion: SIFT_SCORE_VERSION,
  });
  return summary;
}
