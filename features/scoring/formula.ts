import type { Json } from "@/lib/db/database.types";
import {
  scoreComponentKeys,
  type ScoreComponentKey,
  type ScoreComponents,
  type SiftScoreAssessment,
  type SiftScoreEvidenceInput,
} from "@/features/scoring/model";

export const SIFT_SCORE_VERSION = "sift-evidence-v2.2.0";
export const MINIMUM_RELIABILITY_CHECKS = 3;

export const scoreComponentDefinitions = [
  {
    key: "reputation",
    label: "Reputation",
    weight: 15,
    description: "Current reputation score from a named source.",
  },
  {
    key: "reliability",
    label: "Service reliability",
    weight: 25,
    description: "Successful service checks divided by total checks.",
  },
  {
    key: "availability",
    label: "Service availability",
    weight: 20,
    description: "The latest service health check.",
  },
  {
    key: "capability",
    label: "Service information",
    weight: 10,
    description: "Completeness of the agent's published service information.",
  },
  {
    key: "trackRecord",
    label: "Task history",
    weight: 20,
    description: "Reported successful tasks divided by completed tasks.",
  },
  {
    key: "metadata",
    label: "Profile integrity",
    weight: 10,
    description: "Completeness of the agent's recently verified profile.",
  },
] as const satisfies readonly Readonly<{
  description: string;
  key: ScoreComponentKey;
  label: string;
  weight: number;
}>[];

const healthFreshnessMs = 24 * 60 * 60 * 1_000;
const metadataFreshnessMs = 30 * 24 * 60 * 60 * 1_000;
const reputationFreshnessMs = 180 * 24 * 60 * 60 * 1_000;

function round(value: number, places: number): number {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateScoreComponentPoints(
  value: number | null,
  maximumPoints: number,
): number | null {
  return value === null ? null : round((value * maximumPoints) / 100, 2);
}

function isFresh(
  timestamp: string | null,
  asOfMs: number,
  maximumAgeMs: number,
): boolean {
  if (!timestamp) {
    return false;
  }

  const timestampMs = Date.parse(timestamp);
  return (
    Number.isFinite(timestampMs) &&
    timestampMs <= asOfMs &&
    asOfMs - timestampMs <= maximumAgeMs
  );
}

function metadataComponent(input: SiftScoreEvidenceInput): number | null {
  if (input.metadataStatus !== "valid") {
    return null;
  }

  return (
    (input.name?.trim() ? 25 : 0) +
    (input.description?.trim() ? 30 : 0) +
    (input.imageUrl?.trim() ? 10 : 0) +
    (input.ownerAddress ? 10 : 0) +
    (input.active !== null ? 5 : 0) +
    (input.x402Supported !== null ? 5 : 0) +
    (input.metadataVerifiedAt ? 15 : 0)
  );
}

function capabilityComponent(input: SiftScoreEvidenceInput): number | null {
  if (input.metadataStatus !== "valid" || input.services.length === 0) {
    return null;
  }

  const uniqueTypes = new Set(
    input.services.map((service) => service.serviceType.trim().toLowerCase()),
  ).size;
  const hasEndpoint = input.services.some((service) => service.endpoint);
  const hasVersion = input.services.some((service) => service.version);
  const hasStructuredMetadata = input.services.some(
    (service) => service.metadata !== null,
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

function healthComponents(
  input: SiftScoreEvidenceInput,
  asOfMs: number,
): Pick<ScoreComponents, "availability" | "reliability"> {
  const health = input.health;

  if (!health || !isFresh(health.lastCheckedAt, asOfMs, healthFreshnessMs)) {
    return { availability: null, reliability: null };
  }

  const availability =
    health.status === "online"
      ? 100
      : health.status === "degraded"
        ? 40
        : health.status === "offline"
          ? 0
          : null;
  const reliability =
    health.checkCount >= MINIMUM_RELIABILITY_CHECKS
      ? round((health.successCount / health.checkCount) * 100, 2)
      : null;

  return { availability, reliability };
}

function reputationComponents(
  input: SiftScoreEvidenceInput,
  asOfMs: number,
): Pick<ScoreComponents, "reputation" | "trackRecord"> {
  const reputation = input.reputation;

  if (
    !reputation ||
    !reputation.source?.trim() ||
    !isFresh(reputation.sourceObservedAt, asOfMs, reputationFreshnessMs)
  ) {
    return { reputation: null, trackRecord: null };
  }

  const reputationValue = reputation.reputationScore;
  const normalizedReputation =
    reputationValue !== null &&
    Number.isFinite(reputationValue) &&
    reputationValue >= 0 &&
    reputationValue <= 100
      ? round(reputationValue, 2)
      : null;
  const successfulJobs = reputation.successfulJobs ?? 0;
  const failedJobs = reputation.failedJobs ?? 0;
  const completedJobs = successfulJobs + failedJobs;
  const trackRecord =
    completedJobs > 0
      ? round((successfulJobs / completedJobs) * 100, 2)
      : null;

  return { reputation: normalizedReputation, trackRecord };
}

function buildSnapshot(
  input: SiftScoreEvidenceInput,
  components: ScoreComponents,
  evidenceWeight: number,
): Json {
  return {
    activeDeclared: input.active,
    componentMaximumPoints: Object.fromEntries(
      scoreComponentDefinitions.map((component) => [
        component.key,
        component.weight,
      ]),
    ) as Readonly<Record<string, number>>,
    earnedComponentPoints: Object.fromEntries(
      scoreComponentDefinitions.map((component) => [
        component.key,
        calculateScoreComponentPoints(
          components[component.key],
          component.weight,
        ),
      ]),
    ) as Readonly<Record<string, number | null>>,
    evidenceWeight,
    calculationRules: {
      missingEvidencePoints: 0,
      minimumReliabilityChecks: MINIMUM_RELIABILITY_CHECKS,
    },
    health:
      input.health === null
        ? null
        : {
            checkCount: input.health.checkCount,
            failureCount: input.health.failureCount,
            outcome: input.health.outcome,
            status: input.health.status,
            successCount: input.health.successCount,
          },
    metadataStatus: input.metadataStatus,
    normalizedComponents: components,
    reputation:
      input.reputation === null
        ? null
        : {
            failedJobs: input.reputation.failedJobs,
            feedbackCount: input.reputation.feedbackCount,
            reputationScore: input.reputation.reputationScore,
            source: input.reputation.source,
            sourceObservedAt: input.reputation.sourceObservedAt,
            successfulJobs: input.reputation.successfulJobs,
          },
    serviceEvidence: {
      endpointCount: input.services.filter((service) => service.endpoint).length,
      serviceCount: input.services.length,
      uniqueServiceTypes: new Set(
        input.services.map((service) => service.serviceType.toLowerCase()),
      ).size,
      versionedServiceCount: input.services.filter((service) => service.version)
        .length,
    },
    scoringMethod: "sum-earned-component-points",
    version: SIFT_SCORE_VERSION,
    x402Declared: input.x402Supported,
  };
}

export function calculateSiftScore(
  input: SiftScoreEvidenceInput,
  asOf: string,
): SiftScoreAssessment {
  const asOfMs = Date.parse(asOf);

  if (!Number.isFinite(asOfMs)) {
    throw new TypeError("asOf must be a valid timestamp.");
  }

  const metadataIsFresh = isFresh(
    input.metadataVerifiedAt,
    asOfMs,
    metadataFreshnessMs,
  );
  const health = healthComponents(input, asOfMs);
  const reputation = reputationComponents(input, asOfMs);
  const components: ScoreComponents = {
    reputation: reputation.reputation,
    reliability: health.reliability,
    availability: health.availability,
    capability: metadataIsFresh ? capabilityComponent(input) : null,
    trackRecord: reputation.trackRecord,
    metadata: metadataIsFresh ? metadataComponent(input) : null,
  };
  const availableDefinitions = scoreComponentDefinitions.filter(
    (definition) => components[definition.key] !== null,
  );
  const evidenceWeight = availableDefinitions.reduce(
    (total, definition) => total + definition.weight,
    0,
  );
  const earnedPoints = availableDefinitions.reduce(
    (total, definition) =>
      total +
      (calculateScoreComponentPoints(
        components[definition.key],
        definition.weight,
      ) ?? 0),
    0,
  );
  const limitations = scoreComponentKeys
    .filter((key) => components[key] === null)
    .map((key) => {
      const definition = scoreComponentDefinitions.find(
        (candidate) => candidate.key === key,
      );
      return `${definition?.label ?? key} contributes no points because the data is missing or out of date.`;
    });

  return {
    components,
    confidence: round(evidenceWeight / 100, 4),
    evidenceSnapshot: buildSnapshot(input, components, evidenceWeight),
    limitations,
    score: round(earnedPoints, 2),
    sourceFreshness: {
      healthAt: input.health?.lastCheckedAt ?? null,
      metadataAt: input.metadataVerifiedAt,
      reputationAt: input.reputation?.sourceObservedAt ?? null,
    },
    version: SIFT_SCORE_VERSION,
  };
}
