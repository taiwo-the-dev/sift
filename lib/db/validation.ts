import type { Json, TableInsert } from "@/lib/db/database.types";

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
