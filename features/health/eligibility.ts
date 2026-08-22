import { createHash } from "node:crypto";

import type {
  HealthObservation,
  HealthProbeTarget,
  HealthServiceDeclaration,
} from "@/features/health/model";

type EndpointSelection =
  | Readonly<{ observation: HealthObservation; target: null }>
  | Readonly<{ observation: null; target: HealthProbeTarget }>;

function endpointHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function unprobedObservation(
  outcome: HealthObservation["outcome"],
  service: HealthServiceDeclaration | null,
  hash: string | null = null,
): HealthObservation {
  return {
    checkedEndpoint: null,
    endpointHash: hash,
    outcome,
    responseTimeMs: null,
    serviceType: service?.serviceType ?? null,
    status: "unknown",
    wasProbed: false,
  };
}

function inspectDeclaration(
  service: HealthServiceDeclaration,
): EndpointSelection {
  const endpoint = service.endpoint?.trim();

  if (!endpoint) {
    return {
      observation: unprobedObservation("no-endpoint", service),
      target: null,
    };
  }

  const hash = endpointHash(endpoint);
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    return {
      observation: unprobedObservation("invalid-endpoint", service, hash),
      target: null,
    };
  }

  const normalizedType = service.serviceType.trim().toLowerCase();
  const hostname = url.hostname.toLowerCase();
  const isHealthEndpoint = normalizedType === "health";
  const isA2aCard =
    normalizedType === "a2a" &&
    /\/\.well-known\/agent-card\.json\/?$/i.test(url.pathname);

  if (!isHealthEndpoint && !isA2aCard) {
    return {
      observation: unprobedObservation("unsupported-service", service, hash),
      target: null,
    };
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    (url.port && url.port !== "443") ||
    url.search ||
    [".example", ".invalid", ".test"].some((suffix) =>
      hostname.endsWith(suffix),
    )
  ) {
    return {
      observation: unprobedObservation("unsafe-endpoint", service, hash),
      target: null,
    };
  }

  url.hash = "";

  return {
    observation: null,
    target: {
      checkedEndpoint: url.toString(),
      endpointHash: hash,
      kind: isHealthEndpoint ? "health-endpoint" : "a2a-card",
      serviceType: service.serviceType,
    },
  };
}

export function selectHealthEndpoint(
  services: readonly HealthServiceDeclaration[],
): EndpointSelection {
  if (services.length === 0) {
    return {
      observation: unprobedObservation("no-endpoint", null),
      target: null,
    };
  }

  const prioritized = [...services].sort((left, right) => {
    const rank = (service: HealthServiceDeclaration): number => {
      const type = service.serviceType.trim().toLowerCase();
      return type === "health" ? 0 : type === "a2a" ? 1 : 2;
    };

    return rank(left) - rank(right);
  });
  let strongestRejection: HealthObservation | null = null;
  const rejectionPriority: Readonly<Record<HealthObservation["outcome"], number>> = {
    "invalid-endpoint": 4,
    "unsafe-endpoint": 3,
    "no-endpoint": 2,
    "unsupported-service": 1,
    success: 0,
    "http-client-error": 0,
    "http-server-error": 0,
    "invalid-response": 0,
    "response-too-large": 0,
    timeout: 0,
    "network-error": 0,
    "dns-error": 0,
    "redirect-error": 0,
  };

  for (const service of prioritized) {
    const selection = inspectDeclaration(service);

    if (selection.target) {
      return selection;
    }

    if (
      selection.observation &&
      (!strongestRejection ||
        rejectionPriority[selection.observation.outcome] >
          rejectionPriority[strongestRejection.outcome])
    ) {
      strongestRejection = selection.observation;
    }
  }

  return {
    observation:
      strongestRejection ?? unprobedObservation("unsupported-service", null),
    target: null,
  };
}
