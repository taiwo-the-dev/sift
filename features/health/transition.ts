import type {
  HealthObservation,
  HealthSnapshot,
} from "@/features/health/model";

const maximumCheckCount = 1_000;
const maximumFailureCount = 100;

function boundedHistory(
  previous: HealthSnapshot | null,
  endpointHash: string | null,
): Readonly<{ checkCount: number; successCount: number }> {
  if (!previous || previous.endpointHash !== endpointHash) {
    return { checkCount: 0, successCount: 0 };
  }

  if (previous.checkCount < maximumCheckCount) {
    return {
      checkCount: previous.checkCount,
      successCount: previous.successCount,
    };
  }

  return {
    checkCount: Math.floor(previous.checkCount / 2),
    successCount: Math.floor(previous.successCount / 2),
  };
}

export function applyHealthObservation(
  previous: HealthSnapshot | null,
  observation: HealthObservation,
  observedAt: string,
): HealthSnapshot {
  if (Number.isNaN(Date.parse(observedAt))) {
    throw new TypeError("observedAt must be a valid timestamp.");
  }

  const history = boundedHistory(previous, observation.endpointHash);
  const checkCount = observation.wasProbed
    ? history.checkCount + 1
    : history.checkCount;
  const successCount =
    observation.wasProbed && observation.outcome === "success"
      ? history.successCount + 1
      : history.successCount;
  const sameEndpoint = previous?.endpointHash === observation.endpointHash;

  return {
    checkCount,
    checkedEndpoint: observation.checkedEndpoint,
    endpointHash: observation.endpointHash,
    failureCount:
      observation.outcome === "success"
        ? 0
        : observation.wasProbed
          ? Math.min(
              sameEndpoint ? (previous?.failureCount ?? 0) + 1 : 1,
              maximumFailureCount,
            )
          : sameEndpoint
            ? (previous?.failureCount ?? 0)
            : 0,
    lastCheckedAt: observedAt,
    lastSuccessAt:
      observation.outcome === "success"
        ? observedAt
        : (previous?.lastSuccessAt ?? null),
    outcome: observation.outcome,
    responseTimeMs: observation.responseTimeMs,
    serviceType: observation.serviceType,
    status: observation.status,
    successCount,
  };
}
