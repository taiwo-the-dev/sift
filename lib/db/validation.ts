import type { Json, TableInsert } from "@/lib/db/database.types";
import {
  healthOutcomes,
  healthStatuses,
  type HealthSnapshot,
} from "@/features/health/model";
import type { SiftScoreAssessment } from "@/features/scoring/model";

export const agentCategories = [
  "yield-optimisation",
  "grid-trading",
  "health-factor-monitoring",
  "liquidity-rebalancing",
] as const;

export const metadataStatuses = [
  "pending",
  "valid",
  "invalid",
  "unavailable",
] as const;

export type AgentCategory = (typeof agentCategories)[number];
export type MetadataStatus = (typeof metadataStatuses)[number];

export type AgentIdentityInput = Readonly<{
  agentId: string;
  chainId: number;
  registryAddress: string;
}>;

export type AgentWriteInput = AgentIdentityInput &
  Readonly<{
    active: boolean | null;
    agentUri: string | null;
    category: AgentCategory | null;
    description: string | null;
    imageUrl: string | null;
    lastSyncedAt: string | null;
    metadataVerifiedAt: string | null;
    metadataStatus: MetadataStatus;
    name: string | null;
    ownerAddress: string | null;
    registeredAt: string | null;
    registeredBlock: number | null;
    x402Supported: boolean | null;
  }>;

export type SyncCheckpointInput = Readonly<{
  chainId: number;
  lastSyncedBlock: number;
  registryAddress: string;
}>;

export type AgentServiceWriteInput = Readonly<{
  agentDbId: string;
  endpoint: string | null;
  metadata: Json | null;
  serviceType: string;
  version: string | null;
}>;

export type AgentHealthWriteInput = HealthSnapshot &
  Readonly<{ agentDbId: string }>;

export type AgentScoreWriteInput = Readonly<{
  agentDbId: string;
  assessment: SiftScoreAssessment;
  calculatedAt: string;
}>;

const evmAddressPattern = /^0x[0-9a-fA-F]{40}$/;
const unsignedUint256Pattern = /^(0|[1-9][0-9]{0,77})$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertPositiveSafeInteger(value: number, fieldName: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${fieldName} must be a positive safe integer.`);
  }
}

function assertNonNegativeSafeInteger(
  value: number,
  fieldName: string,
): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${fieldName} must be a non-negative safe integer.`);
  }
}

function assertNullableTimestamp(value: string | null, fieldName: string): void {
  if (value !== null && Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${fieldName} must be a valid timestamp or null.`);
  }
}

function assertNullableText(
  value: string | null,
  fieldName: string,
  maximumLength: number,
): void {
  if (value !== null && (value.length === 0 || value.length > maximumLength)) {
    throw new TypeError(
      `${fieldName} must be null or contain 1-${maximumLength} characters.`,
    );
  }
}

export function canonicalizeEvmAddress(
  value: string,
  fieldName: string,
): string {
  if (!evmAddressPattern.test(value)) {
    throw new TypeError(`${fieldName} must be a 20-byte EVM address.`);
  }

  return value.toLowerCase();
}

export function validateAgentIdentity(
  input: AgentIdentityInput,
): TableInsert<"agents"> {
  assertPositiveSafeInteger(input.chainId, "chainId");

  if (!unsignedUint256Pattern.test(input.agentId)) {
    throw new TypeError(
      "agentId must be a canonical unsigned decimal string with at most 78 digits.",
    );
  }

  return {
    agent_id: input.agentId,
    chain_id: input.chainId,
    registry_address: canonicalizeEvmAddress(
      input.registryAddress,
      "registryAddress",
    ),
  };
}

export function validateAgentWrite(
  input: AgentWriteInput,
): TableInsert<"agents"> {
  const identity = validateAgentIdentity(input);

  // ERC-8004 explicitly permits complete base64/data registration files in
  // agentURI. Keep the exact auditable value while bounding pathological input.
  assertNullableText(input.agentUri, "agentUri", 7_000_000);
  assertNullableText(input.name, "name", 256);
  assertNullableText(input.description, "description", 10_000);
  assertNullableText(input.imageUrl, "imageUrl", 2_048);
  assertNullableTimestamp(input.registeredAt, "registeredAt");
  assertNullableTimestamp(input.lastSyncedAt, "lastSyncedAt");
  assertNullableTimestamp(input.metadataVerifiedAt, "metadataVerifiedAt");

  if (input.registeredBlock !== null) {
    assertNonNegativeSafeInteger(input.registeredBlock, "registeredBlock");
  }

  if (
    input.category !== null &&
    !agentCategories.some((category) => category === input.category)
  ) {
    throw new TypeError("category is not a supported Sift agent category.");
  }

  if (
    !metadataStatuses.some((status) => status === input.metadataStatus)
  ) {
    throw new TypeError("metadataStatus is not supported.");
  }

  return {
    ...identity,
    active: input.active,
    agent_uri: input.agentUri,
    category: input.category,
    description: input.description,
    image_url: input.imageUrl,
    last_synced_at: input.lastSyncedAt,
    metadata_verified_at: input.metadataVerifiedAt,
    metadata_status: input.metadataStatus,
    name: input.name,
    owner_address:
      input.ownerAddress === null
        ? null
        : canonicalizeEvmAddress(input.ownerAddress, "ownerAddress"),
    registered_at: input.registeredAt,
    registered_block: input.registeredBlock,
    x402_supported: input.x402Supported,
  };
}

export function validateSyncCheckpoint(
  input: SyncCheckpointInput,
): TableInsert<"sync_state"> {
  assertPositiveSafeInteger(input.chainId, "chainId");
  assertNonNegativeSafeInteger(input.lastSyncedBlock, "lastSyncedBlock");

  return {
    chain_id: input.chainId,
    last_synced_block: input.lastSyncedBlock,
    registry_address: canonicalizeEvmAddress(
      input.registryAddress,
      "registryAddress",
    ),
  };
}

export function validateAgentServiceWrite(
  input: AgentServiceWriteInput,
): TableInsert<"agent_services"> {
  const agentDbId = validateAgentDatabaseId(input.agentDbId);

  const serviceType = input.serviceType.trim();

  if (serviceType.length === 0 || serviceType.length > 100) {
    throw new TypeError("serviceType must contain 1-100 characters.");
  }

  assertNullableText(input.endpoint, "endpoint", 2_048);
  assertNullableText(input.version, "version", 100);

  return {
    agent_db_id: agentDbId,
    endpoint: input.endpoint,
    metadata: input.metadata,
    service_type: serviceType,
    version: input.version,
  };
}

export function validateAgentDatabaseId(value: string): string {
  if (!uuidPattern.test(value)) {
    throw new TypeError("agentDbId must be a valid UUID.");
  }

  return value.toLowerCase();
}

function assertBoundedScore(
  value: number | null,
  fieldName: string,
): void {
  if (
    value !== null &&
    (!Number.isFinite(value) || value < 0 || value > 100)
  ) {
    throw new TypeError(`${fieldName} must be null or a number from 0 to 100.`);
  }
}

function assertJsonObject(value: Json, fieldName: string): void {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be a JSON object.`);
  }
}

export function validateAgentHealthWrite(
  input: AgentHealthWriteInput,
): TableInsert<"agent_health"> {
  const agentDbId = validateAgentDatabaseId(input.agentDbId);

  if (!healthStatuses.some((status) => status === input.status)) {
    throw new TypeError("status is not a supported health status.");
  }

  if (
    input.outcome !== null &&
    !healthOutcomes.some((outcome) => outcome === input.outcome)
  ) {
    throw new TypeError("outcome is not a supported health outcome.");
  }

  assertNonNegativeSafeInteger(input.checkCount, "checkCount");
  assertNonNegativeSafeInteger(input.successCount, "successCount");
  assertNonNegativeSafeInteger(input.failureCount, "failureCount");
  assertNullableTimestamp(input.lastSuccessAt, "lastSuccessAt");
  assertNullableText(input.checkedEndpoint, "checkedEndpoint", 2_048);
  assertNullableText(input.endpointHash, "endpointHash", 64);
  assertNullableText(input.serviceType, "serviceType", 100);

  if (Number.isNaN(Date.parse(input.lastCheckedAt))) {
    throw new TypeError("lastCheckedAt must be a valid timestamp.");
  }

  if (input.checkCount > 1_000 || input.successCount > input.checkCount) {
    throw new TypeError(
      "health history must be bounded and successes cannot exceed checks.",
    );
  }

  if (input.failureCount > 100) {
    throw new TypeError("failureCount must not exceed 100.");
  }

  if (
    input.responseTimeMs !== null &&
    (!Number.isSafeInteger(input.responseTimeMs) || input.responseTimeMs < 0)
  ) {
    throw new TypeError("responseTimeMs must be null or non-negative.");
  }

  if (
    input.checkedEndpoint !== null &&
    !input.checkedEndpoint.startsWith("https://")
  ) {
    throw new TypeError("checkedEndpoint must be null or use HTTPS.");
  }

  if (
    input.endpointHash !== null &&
    !/^[0-9a-f]{64}$/.test(input.endpointHash)
  ) {
    throw new TypeError("endpointHash must be a lowercase SHA-256 digest.");
  }

  return {
    agent_db_id: agentDbId,
    check_count: input.checkCount,
    checked_endpoint: input.checkedEndpoint,
    endpoint_hash: input.endpointHash,
    failure_count: input.failureCount,
    last_checked_at: input.lastCheckedAt,
    last_success_at: input.lastSuccessAt,
    outcome: input.outcome,
    response_time_ms: input.responseTimeMs,
    service_type: input.serviceType,
    status: input.status,
    success_count: input.successCount,
  };
}

export function validateAgentScoreWrite(
  input: AgentScoreWriteInput,
): TableInsert<"agent_scores"> {
  const agentDbId = validateAgentDatabaseId(input.agentDbId);
  const { assessment } = input;

  if (Number.isNaN(Date.parse(input.calculatedAt))) {
    throw new TypeError("calculatedAt must be a valid timestamp.");
  }

  if (
    !Number.isFinite(assessment.confidence) ||
    assessment.confidence < 0 ||
    assessment.confidence > 1
  ) {
    throw new TypeError("confidence must be a number from 0 to 1.");
  }

  assertBoundedScore(assessment.score, "score");
  assertBoundedScore(assessment.components.availability, "availability");
  assertBoundedScore(assessment.components.capability, "capability");
  assertBoundedScore(assessment.components.metadata, "metadata");
  assertBoundedScore(assessment.components.reliability, "reliability");
  assertBoundedScore(assessment.components.reputation, "reputation");
  assertBoundedScore(assessment.components.trackRecord, "trackRecord");
  assertJsonObject(assessment.evidenceSnapshot, "evidenceSnapshot");

  if (!assessment.version.trim()) {
    throw new TypeError("score version must not be empty.");
  }

  const sourceFreshness: Json = {
    healthAt: assessment.sourceFreshness.healthAt,
    metadataAt: assessment.sourceFreshness.metadataAt,
    reputationAt: assessment.sourceFreshness.reputationAt,
  };

  return {
    agent_db_id: agentDbId,
    availability_component: assessment.components.availability,
    calculated_at: input.calculatedAt,
    capability_component: assessment.components.capability,
    confidence: assessment.confidence,
    evidence_snapshot: assessment.evidenceSnapshot,
    metadata_component: assessment.components.metadata,
    reliability_component: assessment.components.reliability,
    reputation_component: assessment.components.reputation,
    score_version: assessment.version,
    sift_score: assessment.score,
    source_freshness: sourceFreshness,
    track_record_component: assessment.components.trackRecord,
  };
}
