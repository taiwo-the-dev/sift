export const healthStatuses = [
  "online",
  "degraded",
  "offline",
  "unknown",
] as const;

export const healthOutcomes = [
  "success",
  "http-client-error",
  "http-server-error",
  "invalid-response",
  "response-too-large",
  "timeout",
  "network-error",
  "dns-error",
  "redirect-error",
  "invalid-endpoint",
  "unsafe-endpoint",
  "unsupported-service",
  "no-endpoint",
] as const;

export type HealthStatus = (typeof healthStatuses)[number];
export type HealthOutcome = (typeof healthOutcomes)[number];

export type HealthServiceDeclaration = Readonly<{
  endpoint: string | null;
  serviceType: string;
}>;

export type HealthProbeKind = "a2a-card" | "health-endpoint";

export type HealthProbeTarget = Readonly<{
  checkedEndpoint: string;
  endpointHash: string;
  kind: HealthProbeKind;
  serviceType: string;
}>;

export type HealthObservation = Readonly<{
  checkedEndpoint: string | null;
  endpointHash: string | null;
  outcome: HealthOutcome;
  responseTimeMs: number | null;
  serviceType: string | null;
  status: HealthStatus;
  wasProbed: boolean;
}>;

export type HealthSnapshot = Readonly<{
  checkCount: number;
  checkedEndpoint: string | null;
  endpointHash: string | null;
  failureCount: number;
  lastCheckedAt: string;
  lastSuccessAt: string | null;
  outcome: HealthOutcome | null;
  responseTimeMs: number | null;
  serviceType: string | null;
  status: HealthStatus;
  successCount: number;
}>;

export type HealthCandidate = Readonly<{
  agentDbId: string;
  agentId: string;
  chainId: number;
  previousHealth: HealthSnapshot | null;
  services: readonly HealthServiceDeclaration[];
}>;
