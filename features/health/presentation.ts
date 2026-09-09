import type {
  HealthOutcome,
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
