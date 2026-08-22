import type {
  PersistedSiftScore,
  ScoreComponentKey,
} from "@/features/scoring/model";
import { scoreComponentDefinitions } from "@/features/scoring/formula";

export function describeScoreConfidence(confidence: number): string {
  if (confidence >= 0.75) {
    return "High confidence";
  }

  if (confidence >= 0.5) {
    return "Moderate confidence";
  }

  if (confidence > 0) {
    return "Low confidence";
  }

  return "No supported confidence";
}

export function formatScoreConfidence(confidence: number): string {
  return `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}% evidence coverage`;
}

export function isScoreStale(
  calculatedAt: string,
  asOf: Date = new Date(),
): boolean {
  const calculated = Date.parse(calculatedAt);
  const age = asOf.getTime() - calculated;
  return (
    !Number.isFinite(calculated) ||
    age < 0 ||
    age > 24 * 60 * 60 * 1_000
  );
}

export function scoreComponentRows(score: PersistedSiftScore) {
  return scoreComponentDefinitions.map((definition) => {
    const value = score.components[definition.key];
    const contribution =
      value === null ? null : (value * definition.weight) / 100;

    return {
      ...definition,
      contribution,
      value,
    };
  });
}

export function scoreComponentValue(
  score: PersistedSiftScore,
  key: ScoreComponentKey,
): number | null {
  return score.components[key];
}
