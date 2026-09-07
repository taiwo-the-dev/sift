import { createHash } from "node:crypto";

import type {
  HealthObservation,
  HealthProbeKind,
  HealthProbeTarget,
  HealthServiceDeclaration,
} from "@/features/health/model";

const A2A_CARD_PATH = "/.well-known/agent-card.json";
const a2aCardPattern = /\/\.well-known\/agent-card\.json\/?$/i;

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

  const declaredHash = endpointHash(endpoint);
  let url: URL;

  try {
    url = new URL(endpoint);
  } catch {
    return {
      observation: unprobedObservation("invalid-endpoint", service, declaredHash),
      target: null,
    };
  }

  const normalizedType = service.serviceType.trim().toLowerCase();
  const isHealthEndpoint = normalizedType === "health";
  const isA2a = normalizedType === "a2a";

  if (!isHealthEndpoint && !isA2a) {
    return {
      observation: unprobedObservation(
        "unsupported-service",
        service,
        declaredHash,
      ),
      target: null,
    };
  }

  // A `health` service is probed exactly as declared. An `a2a` service is
  // resolved to the standard A2A discovery document at the origin unless the
  // declaration already points straight at that document.
  let probeUrl: URL;
  let kind: HealthProbeKind;

  if (isHealthEndpoint) {
    probeUrl = new URL(url.toString());
    kind = "health-endpoint";
  } else {
    kind = "a2a-card";
    probeUrl = a2aCardPattern.test(url.pathname)
      ? new URL(url.toString())
      : new URL(A2A_CARD_PATH, url.origin);
  }

  probeUrl.hash = "";

  const hostname = probeUrl.hostname.toLowerCase();

  if (
    probeUrl.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    (probeUrl.port && probeUrl.port !== "443") ||
    [".example", ".invalid", ".test"].some((suffix) =>
      hostname.endsWith(suffix),
    )
  ) {
    return {
      observation: unprobedObservation("unsafe-endpoint", service, declaredHash),
      target: null,
    };
  }

  return {
    observation: null,
    target: {
      checkedEndpoint: probeUrl.toString(),
      endpointHash: endpointHash(probeUrl.toString()),
      kind,
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
