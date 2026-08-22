import type {
  HealthOutcome,
  HealthSnapshot,
} from "@/features/health/model";

const outcomeLabels: Readonly<Record<HealthOutcome, string>> = {
  "dns-error": "Public host could not be resolved",
  "http-client-error": "Endpoint responded, but the check was inconclusive",
  "http-server-error": "Endpoint returned a transient or server error",
  "invalid-endpoint": "Declared endpoint is invalid",
  "invalid-response": "Endpoint response did not match the check protocol",
  "network-error": "Network connection failed",
  "no-endpoint": "No endpoint was declared",
  "redirect-error": "Endpoint redirect could not be checked safely",
  "response-too-large": "Endpoint response exceeded the safety limit",
  success: "Bounded endpoint check succeeded",
  timeout: "Endpoint did not respond before the timeout",
  "unsafe-endpoint": "Endpoint was blocked by the safety policy",
  "unsupported-service": "Service type is not safely checkable",
};

export function describeHealthOutcome(
  outcome: HealthOutcome | null,
): string {
  return outcome ? outcomeLabels[outcome] : "Observation detail unavailable";
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
