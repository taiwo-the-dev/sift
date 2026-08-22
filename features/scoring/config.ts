export type ScoreRunConfig = Readonly<{
  batchLimit: number;
}>;

type EnvironmentSource = Readonly<Record<string, string | undefined>>;

export function parseScoreRunConfig(
  source: EnvironmentSource,
): ScoreRunConfig {
  const raw = source.SCORE_BATCH_LIMIT?.trim();
  const batchLimit = raw ? Number(raw) : 200;

  if (!Number.isInteger(batchLimit) || batchLimit < 1 || batchLimit > 500) {
    throw new TypeError("SCORE_BATCH_LIMIT must be an integer from 1 to 500.");
  }

  return Object.freeze({ batchLimit });
}
