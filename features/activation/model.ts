import type { Json } from "@/lib/db/database.types";

export const activationMethods = ["erc8183", "a2a", "mcp", "x402"] as const;
export type ActivationMethod = (typeof activationMethods)[number];

export const activationAvailabilityStatuses = [
  "unchecked",
  "available",
  "degraded",
  "unavailable",
  "unsupported",
] as const;
export type ActivationAvailabilityStatus =
  (typeof activationAvailabilityStatuses)[number];

export const ACTIVATION_VALIDATION_VERSION = "sift-activation-v1.0.0";
export const ACTIVATION_FRESHNESS_HOURS = 24;

export type ActivationServiceEvidence = Readonly<{
  checkedAt: string | null;
  failureCode: string | null;
  lastSuccessAt: string | null;
  method: ActivationMethod | null;
  responseTimeMs: number | null;
  serviceId: string;
  status: ActivationAvailabilityStatus;
  summary: Json | null;
  validationVersion: string | null;
}>;

export type ActivationCandidate = Readonly<{
  agentDbId: string;
  agentId: string;
  chainId: number;
  endpoint: string;
  failureCount: number;
  lastSuccessAt: string | null;
  method: ActivationMethod;
  ownerAddress: string | null;
  serviceId: string;
  serviceType: string;
  status: ActivationAvailabilityStatus;
  version: string | null;
}>;

export type ActivationObservation = Readonly<{
  capabilitySummary: Json | null;
  failureCode: string | null;
  method: ActivationMethod;
  responseTimeMs: number | null;
  serviceId: string;
  status: ActivationAvailabilityStatus;
}>;

export function classifyActivationMethod(
  serviceType: string,
): ActivationMethod | null {
  const normalized = serviceType.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

  if (normalized === "erc8183") return "erc8183";
  if (["a2a", "agent2agent", "agenttoagent"].includes(normalized)) return "a2a";
  if (["mcp", "modelcontextprotocol"].includes(normalized)) return "mcp";
  if (["x402", "b402"].includes(normalized)) return "x402";
  return null;
}

export function parseActivationMethod(value: string): ActivationMethod {
  const method = activationMethods.find((candidate) => candidate === value);
  if (!method) throw new TypeError("Unsupported activation method from database.");
  return method;
}

export function parseActivationStatus(
  value: unknown,
): ActivationAvailabilityStatus {
  const status = activationAvailabilityStatuses.find(
    (candidate) => candidate === value,
  );
  // A code deploy may briefly run before the additive hosted migration. Missing
  // or unrecognized evidence must be treated as unchecked, never available.
  return status ?? "unchecked";
}

export function isActivationEvidenceCurrent(
  evidence: Readonly<{
    lastSuccessAt?: string | null;
    status?: ActivationAvailabilityStatus;
  }>,
  now: number = Date.now(),
): boolean {
  if (evidence.status !== "available" || !evidence.lastSuccessAt) return false;
  const observedAt = Date.parse(evidence.lastSuccessAt);
  return (
    Number.isFinite(observedAt) &&
    now - observedAt <= ACTIVATION_FRESHNESS_HOURS * 60 * 60 * 1_000
  );
}

export function hasCurrentActivation(
  services: readonly Readonly<{
    availabilityLastSuccessAt?: string | null;
    availabilityStatus?: ActivationAvailabilityStatus;
  }>[],
  now: number = Date.now(),
): boolean {
  return services.some((service) =>
    isActivationEvidenceCurrent(
      {
        lastSuccessAt: service.availabilityLastSuccessAt,
        status: service.availabilityStatus,
      },
      now,
    ),
  );
}

export function formatActivationMethod(method: ActivationMethod): string {
  if (method === "erc8183") return "Protected hire";
  if (method === "mcp") return "Run a tool";
  if (method === "a2a") return "Send a task";
  return "Pay per request";
}
