import type {
  HealthOutcome,
  HealthServiceDeclaration,
  HealthSnapshot,
} from "@/features/health/model";

const outcomeLabels: Readonly<Record<HealthOutcome, string>> = {
  "dns-error": "Public host could not be resolved",
  "http-client-error": "The service responded, but the result was unclear",
  "http-server-error": "The service returned an error",
  "invalid-endpoint": "The service address is invalid",
  "invalid-response": "The service response could not be verified",
  "network-error": "Network connection failed",
  "no-endpoint": "No service address is available",
  "redirect-error": "The service redirect could not be checked safely",
  "response-too-large": "The service response exceeded the safety limit",
  success: "The service responded successfully",
  timeout: "The service did not respond in time",
  "unsafe-endpoint": "The service address was blocked by the safety policy",
  "unsupported-service": "Service type is not safely checkable",
};

const healthCheckTimeFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "short",
  timeZone: "UTC",
});

export function formatHealthCheckTime(value: string): string {
  const checkedAt = new Date(value);

  return Number.isNaN(checkedAt.getTime())
    ? "time unavailable"
    : `${healthCheckTimeFormatter.format(checkedAt)} UTC`;
}

export function describeHealthOutcome(
  outcome: HealthOutcome | null,
): string {
  return outcome ? outcomeLabels[outcome] : "Health-check details unavailable";
}

export type HealthPresentation = Readonly<{
  detail: string;
  label: string;
  state:
    | "could-not-verify"
    | "degraded"
    | "no-checkable-service"
    | "not-checked"
    | "offline"
    | "online";
}>;

type PresentableHealth = Pick<
  HealthSnapshot,
  "checkCount" | "lastCheckedAt" | "outcome" | "status"
>;

function hasCheckableDeclaration(
  services: readonly HealthServiceDeclaration[],
): boolean {
  return services.some((service) => {
    const serviceType = service.serviceType.trim().toLowerCase();

    if (
      !service.endpoint ||
      (serviceType !== "health" && serviceType !== "a2a")
    ) {
      return false;
    }

    try {
      const endpoint = new URL(service.endpoint);

      return (
        endpoint.protocol === "https:" &&
        !endpoint.username &&
        !endpoint.password &&
        !endpoint.search &&
        (!endpoint.port || endpoint.port === "443")
      );
    } catch {
      return false;
    }
  });
}

export function getHealthPresentation(
  health: PresentableHealth | null,
  services: readonly HealthServiceDeclaration[] = [],
): HealthPresentation {
  if (!health) {
    return hasCheckableDeclaration(services)
      ? {
          detail: "Waiting for the first health check",
          label: "Not checked yet",
          state: "not-checked",
        }
      : {
          detail: "No Health or A2A service is available to check",
          label: "No checkable service",
          state: "no-checkable-service",
        };
  }

  if (health.status === "online") {
    return {
      detail: `Checked ${formatHealthCheckTime(health.lastCheckedAt)}`,
      label: "Online",
      state: "online",
    };
  }

  if (health.status === "offline") {
    return {
      detail: `Checked ${formatHealthCheckTime(health.lastCheckedAt)}`,
      label: "Offline",
      state: "offline",
    };
  }

  if (health.status === "degraded") {
    return {
      detail: `Checked ${formatHealthCheckTime(health.lastCheckedAt)}`,
      label: "Degraded",
      state: "degraded",
    };
  }

  if (health.checkCount > 0) {
    return {
      detail: `Checked ${formatHealthCheckTime(health.lastCheckedAt)} · ${describeHealthOutcome(health.outcome)}`,
      label: "Couldn’t verify",
      state: "could-not-verify",
    };
  }

  if (
    health.outcome === "no-endpoint" ||
    health.outcome === "invalid-endpoint" ||
    health.outcome === "unsafe-endpoint" ||
    health.outcome === "unsupported-service"
  ) {
    return {
      detail: describeHealthOutcome(health.outcome),
      label: "No checkable service",
      state: "no-checkable-service",
    };
  }

  return {
    detail: "Waiting for the first health check",
    label: "Not checked yet",
    state: "not-checked",
  };
}

export function isHealthStale(
  health: Pick<HealthSnapshot, "lastCheckedAt">,
  asOf: Date = new Date(),
): boolean {
  const checkedAt = Date.parse(health.lastCheckedAt);
  const age = asOf.getTime() - checkedAt;
  return (
    !Number.isFinite(checkedAt) ||
    age < 0 ||
    age > 24 * 60 * 60 * 1_000
  );
}
