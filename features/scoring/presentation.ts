import type {
  PersistedSiftScore,
  ScoreComponentKey,
  ScoreComponents,
  ScoringHealth,
  ScoringReputation,
} from "@/features/scoring/model";
import {
  calculateSiftScore,
  calculateScoreComponentPoints,
  scoreComponentDefinitions,
} from "@/features/scoring/formula";
import type { Json } from "@/lib/db/database.types";
import type { MetadataStatus } from "@/lib/db/validation";

export type AgentRatingKind = "calculated" | "stale" | "verified";

type AgentRatingService = Readonly<{
  endpoint: string | null;
  metadata?: Json | null;
  serviceType: string;
  version: string | null;
}>;

export type AgentRatingInput = Readonly<{
  active: boolean | null;
  description: string | null;
  health?: ScoringHealth | null;
  imageUrl: string | null;
  lastSyncedAt?: string | null;
  metadataStatus: MetadataStatus;
  metadataVerifiedAt?: string | null;
  name: string | null;
  ownerAddress: string | null;
  reputation?: ScoringReputation | null;
  score: PersistedSiftScore | null;
  services: readonly AgentRatingService[];
  x402Supported: boolean | null;
}>;

export type AgentRatingPresentation = Readonly<{
  coverage: number;
  components: ScoreComponents;
  detail: string;
  kind: AgentRatingKind;
  label: "Score needs updating" | "Sift Score";
  profileCompleteness: number;
  value: number;
}>;

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function scoreFromComponents(components: ScoreComponents): number {
  return round(
    scoreComponentDefinitions.reduce(
      (total, definition) =>
        total +
        (calculateScoreComponentPoints(
          components[definition.key],
          definition.weight,
        ) ?? 0),
      0,
    ),
    2,
  );
}

/**
 * Present the direct sum of the six earned component-point values. Missing or
 * expired evidence contributes zero points and is disclosed through coverage
 * and the criteria breakdown instead of hiding the numeric result.
 */
export function getAgentRating(
  input: AgentRatingInput,
  asOf: Date = new Date(),
): AgentRatingPresentation {
  const scoreUsesDirectSumFormula = input.score?.version.startsWith(
    "sift-evidence-v2.",
  ) ?? false;

  if (scoreUsesDirectSumFormula && input.score) {
    const stale = isScoreStale(input.score.calculatedAt, asOf);
    const value = scoreFromComponents(input.score.components);
    const profileCompleteness = round(
      ((input.score.components.metadata ?? 0) +
        (input.score.components.capability ?? 0)) /
        2,
      2,
    );

    return {
      coverage: input.score.confidence,
      components: input.score.components,
      detail: stale
        ? `${formatScoreConfidence(input.score.confidence)} · last known assessment`
        : formatScoreConfidence(input.score.confidence),
      kind: stale ? "stale" : "verified",
      label: stale ? "Score needs updating" : "Sift Score",
      profileCompleteness,
      value,
    };
  }

  const assessment = calculateSiftScore(
    {
      active: input.active,
      description: input.description,
      health: input.health ?? null,
      imageUrl: input.imageUrl,
      metadataStatus: input.metadataStatus,
      metadataVerifiedAt:
        input.metadataVerifiedAt ??
        (input.metadataStatus === "valid" ? input.lastSyncedAt ?? null : null),
      name: input.name,
      ownerAddress: input.ownerAddress,
      reputation: input.reputation ?? null,
      services: input.services.map((service) => ({
        endpoint: service.endpoint,
        metadata: service.metadata ?? null,
        serviceType: service.serviceType,
        version: service.version,
      })),
      x402Supported: input.x402Supported,
    },
    asOf.toISOString(),
  );
  const profileCompleteness = round(
    ((assessment.components.metadata ?? 0) +
      (assessment.components.capability ?? 0)) /
      2,
    2,
  );

  return {
    coverage: assessment.confidence,
    components: assessment.components,
    detail: `${formatScoreConfidence(assessment.confidence)} · calculated from available evidence`,
    kind: "calculated",
    label: "Sift Score",
    profileCompleteness,
    value: assessment.score ?? 0,
  };
}

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

  return "Not enough data";
}

export function formatScoreConfidence(confidence: number): string {
  return `${Math.round(Math.max(0, Math.min(1, confidence)) * 100)}% data coverage`;
}

export type ScoreTier = "excellent" | "good" | "fair" | "weak" | "unavailable";

export function describeScoreTier(
  score: number | null,
): Readonly<{ label: string; tier: ScoreTier }> {
  if (score === null || !Number.isFinite(score)) {
    return { label: "Not available", tier: "unavailable" };
  }

  if (score >= 80) {
    return { label: "Excellent", tier: "excellent" };
  }

  if (score >= 60) {
    return { label: "Good", tier: "good" };
  }

  if (score >= 40) {
    return { label: "Fair", tier: "fair" };
  }

  return { label: "Weak", tier: "weak" };
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
  return scoreComponentRowsFromComponents(score.components);
}

export function scoreComponentRowsFromComponents(components: ScoreComponents) {
  return scoreComponentDefinitions.map((definition) => {
    const value = components[definition.key];
    const contribution = calculateScoreComponentPoints(
      value,
      definition.weight,
    );

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
