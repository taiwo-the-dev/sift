import type {
  PersistedSiftScore,
  ScoreComponentKey,
} from "@/features/scoring/model";
import { scoreComponentDefinitions } from "@/features/scoring/formula";
import type { MetadataStatus } from "@/lib/db/validation";

export type AgentRatingKind = "profile" | "provisional" | "verified";

type AgentRatingService = Readonly<{
  endpoint: string | null;
  metadata?: unknown;
  serviceType: string;
  version: string | null;
}>;

export type AgentRatingInput = Readonly<{
  active: boolean | null;
  description: string | null;
  imageUrl: string | null;
  lastSyncedAt?: string | null;
  metadataStatus: MetadataStatus;
  metadataVerifiedAt?: string | null;
  name: string | null;
  ownerAddress: string | null;
  score: PersistedSiftScore | null;
  services: readonly AgentRatingService[];
  x402Supported: boolean | null;
}>;

export type AgentRatingPresentation = Readonly<{
  coverage: number;
  detail: string;
  kind: AgentRatingKind;
  label: "Profile Rating" | "Provisional Rating" | "Sift Score";
  value: number;
}>;

const independentComponentKeys = [
  "reputation",
  "reliability",
  "availability",
  "trackRecord",
] as const satisfies readonly ScoreComponentKey[];

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function supportedComponentAverage(score: PersistedSiftScore): number | null {
  const supported = scoreComponentDefinitions.filter(
    (definition) => score.components[definition.key] !== null,
  );
  const supportedWeight = supported.reduce(
    (total, definition) => total + definition.weight,
    0,
  );
  if (supportedWeight === 0) return null;

  const weightedTotal = supported.reduce(
    (total, definition) =>
      total + (score.components[definition.key] ?? 0) * definition.weight,
    0,
  );
  return round(weightedTotal / supportedWeight, 2);
}

function profileComponent(input: AgentRatingInput): number {
  if (input.metadataStatus !== "valid") return 0;

  return (
    (input.name?.trim() ? 25 : 0) +
    (input.description?.trim() ? 30 : 0) +
    (input.imageUrl?.trim() ? 10 : 0) +
    (input.ownerAddress ? 10 : 0) +
    (input.active !== null ? 5 : 0) +
    (input.x402Supported !== null ? 5 : 0) +
    (input.metadataVerifiedAt || input.lastSyncedAt ? 15 : 0)
  );
}

function serviceComponent(input: AgentRatingInput): number {
  if (input.metadataStatus !== "valid" || input.services.length === 0) {
    return 0;
  }

  const uniqueTypes = new Set(
    input.services.map((service) => service.serviceType.trim().toLowerCase()),
  ).size;
  const hasEndpoint = input.services.some((service) => service.endpoint);
  const hasVersion = input.services.some((service) => service.version);
  const hasStructuredMetadata = input.services.some(
    (service) => service.metadata !== null && service.metadata !== undefined,
  );

  return Math.min(
    100,
    40 +
      (uniqueTypes >= 2 ? 20 : 0) +
      (uniqueTypes >= 3 ? 10 : 0) +
      (hasEndpoint ? 15 : 0) +
      (hasVersion ? 10 : 0) +
      (hasStructuredMetadata ? 5 : 0),
  );
}

function profileRating(input: AgentRatingInput): number {
  // These are the same profile-quality (5%) and service-information (15%)
  // components used by the Sift Score, normalized within their combined 20%.
  return round(
    (profileComponent(input) * 5 + serviceComponent(input) * 15) / 20,
    2,
  );
}

/**
 * Present the best honest rating available for an agent. Only a persisted,
 * publishable score is called a Sift Score. Limited independent observations
 * are provisional, while declarations alone produce a Profile Rating.
 */
export function getAgentRating(
  input: AgentRatingInput,
): AgentRatingPresentation {
  if (input.score?.score !== null && input.score?.score !== undefined) {
    return {
      coverage: input.score.confidence,
      detail: formatScoreConfidence(input.score.confidence),
      kind: "verified",
      label: "Sift Score",
      value: input.score.score,
    };
  }

  const hasIndependentEvidence = input.score
    ? independentComponentKeys.some(
        (key) => input.score?.components[key] !== null,
      )
    : false;
  const provisionalValue = input.score
    ? supportedComponentAverage(input.score)
    : null;

  if (hasIndependentEvidence && provisionalValue !== null && input.score) {
    return {
      coverage: input.score.confidence,
      detail: `${formatScoreConfidence(input.score.confidence)} · more evidence needed`,
      kind: "provisional",
      label: "Provisional Rating",
      value: provisionalValue,
    };
  }

  const hasVerifiedProfile = input.metadataStatus === "valid";
  const profileCoverage = hasVerifiedProfile
    ? (5 + (input.services.length > 0 ? 15 : 0)) / 100
    : 0;

  return {
    coverage: profileCoverage,
    detail: hasVerifiedProfile
      ? "Based on published profile and service information"
      : "No verified profile information",
    kind: "profile",
    label: "Profile Rating",
    value: profileRating(input),
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
