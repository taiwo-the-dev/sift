import "server-only";

import { z } from "zod";

import type { CategorySlug } from "@/features/categories/taxonomy";
import type { Json } from "@/lib/db/database.types";
import {
  createExternalEvidenceRepository,
  type ExternalEvidenceRecord,
  type ExternalEvidenceRepository,
} from "@/lib/db/external-evidence-repository";

const API_BASE_URL = "https://api.8004scan.io/api/v1";
const AVAILABLE_CACHE_MS = 6 * 60 * 60 * 1_000;
const UNAVAILABLE_CACHE_MS = 15 * 60 * 1_000;
const MAX_RESPONSE_BYTES = 512_000;

const nullableText = z.union([z.string(), z.null()]).optional();
const nullableNumber = z.union([z.number(), z.string(), z.null()]).optional();
const agentSchema = z
  .object({
    average_score: nullableNumber,
    categories: z.unknown().optional(),
    chain_id: z.union([z.number(), z.string()]),
    chain_type: nullableText,
    contract_address: nullableText,
    description: nullableText,
    image: nullableText,
    is_testnet: z.union([z.boolean(), z.null()]).optional(),
    name: nullableText,
    network: z.unknown().optional(),
    owner_address: nullableText,
    services: z.unknown().optional(),
    supported_protocols: z.unknown().optional(),
    tags: z.unknown().optional(),
    token_id: z.union([z.number(), z.string()]),
    total_feedbacks: nullableNumber,
    total_validations: nullableNumber,
  })
  .loose();

export type ScanCrossCheckAvailability =
  | "available"
  | "conflict"
  | "field-unavailable"
  | "unavailable";

export type ScanCrossCheck = Readonly<{
  availability: ScanCrossCheckAvailability;
  capabilities: readonly string[];
  categories: readonly CategorySlug[];
  conflictFields: readonly string[];
  feedbackCount: number | null;
  identity: Readonly<{
    agentId: string;
    chainId: number;
    registryAddress: string | null;
  }> | null;
  name: string | null;
  network: string | null;
  observedAt: string;
  ownerAddress: string | null;
  reputationScore: number | null;
  source: "8004scan";
  sourceReference: string;
  validationCount: number | null;
}>;

export type ScanLocalAgent = Readonly<{
  agentDbId: string;
  agentId: string;
  categories: readonly CategorySlug[];
  chainId: number;
  ownerAddress: string | null;
  registryAddress: string;
}>;

type ScanClientOptions = Readonly<{
  apiKey?: string;
  cache?: ExternalEvidenceRepository;
  fetchImpl?: typeof fetch;
  forceRefresh?: boolean;
  now?: () => Date;
  wait?: (milliseconds: number) => Promise<void>;
}>;

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function optionalNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function flattenLabels(value: unknown): readonly string[] {
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(flattenLabels);
  if (typeof value !== "object" || value === null) return [];

  const record = value as Readonly<Record<string, unknown>>;
  return [record.name, record.label, record.type, record.protocol].flatMap(flattenLabels);
}

function sourceReference(agentId: string): string {
  return `https://8004scan.io/agents/bsc/${agentId}`;
}

function normalizeAddress(value: string | null | undefined): string | null {
  const address = value?.trim();
  return address && /^0x[0-9a-f]{40}$/i.test(address)
    ? address.toLowerCase()
    : null;
}

export function mapStored8004ScanEvidence(
  record: ExternalEvidenceRecord,
): ScanCrossCheck | null {
  if (
    typeof record.normalized_evidence !== "object" ||
    record.normalized_evidence === null ||
    Array.isArray(record.normalized_evidence)
  ) {
    return null;
  }

  const value = record.normalized_evidence;
  const identity =
    typeof value.agentId === "string" && typeof value.chainId === "number"
      ? {
          agentId: value.agentId,
          chainId: value.chainId,
          registryAddress:
            typeof value.registryAddress === "string" ? value.registryAddress : null,
        }
      : null;

  return {
    availability: record.availability as ScanCrossCheckAvailability,
    capabilities: Array.isArray(value.capabilities)
      ? value.capabilities.filter((item): item is string => typeof item === "string")
      : [],
    categories: Array.isArray(value.categories)
      ? value.categories.filter(
          (item): item is CategorySlug =>
            item === "yield-optimisation" ||
            item === "grid-trading" ||
            item === "health-factor-monitoring" ||
            item === "liquidity-rebalancing",
        )
      : [],
    conflictFields: record.conflict_fields,
    feedbackCount: typeof value.feedbackCount === "number" ? value.feedbackCount : null,
    identity,
    name: typeof value.name === "string" ? value.name : null,
    network: typeof value.network === "string" ? value.network : null,
    observedAt: record.observed_at,
    ownerAddress: typeof value.ownerAddress === "string" ? value.ownerAddress : null,
    reputationScore:
      typeof value.reputationScore === "number" ? value.reputationScore : null,
    source: "8004scan",
    sourceReference: record.source_reference,
    validationCount:
      typeof value.validationCount === "number" ? value.validationCount : null,
  };
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const declaredLength = response.headers.get("content-length");
  if (declaredLength && Number(declaredLength) > MAX_RESPONSE_BYTES) {
    throw new Error("8004scan response exceeded the configured size limit.");
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("8004scan returned an unsupported content type.");
  }

  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
    throw new Error("8004scan response exceeded the configured size limit.");
  }

  return JSON.parse(text) as unknown;
}

export function create8004ScanClient(options: ScanClientOptions = {}) {
  const apiKey = options.apiKey?.trim() || undefined;
  const cache = options.cache ?? createExternalEvidenceRepository();
  const fetchImpl = options.fetchImpl ?? fetch;
  const forceRefresh = options.forceRefresh ?? false;
  const now = options.now ?? (() => new Date());
  const wait = options.wait ?? ((milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)));
  const requestIntervalMs = apiKey ? 125 : 2_100;
  let lastRequestAt = 0;

  return {
    async crossCheck(local: ScanLocalAgent): Promise<ScanCrossCheck> {
      const cached = await cache.find(local.agentDbId, "8004scan");
      if (
        !forceRefresh &&
        cached &&
        Date.parse(cached.expires_at) > now().getTime()
      ) {
        const mapped = mapStored8004ScanEvidence(cached);
        if (mapped) return mapped;
      }

      const delay = Math.max(0, lastRequestAt + requestIntervalMs - now().getTime());
      if (delay > 0) await wait(delay);
      lastRequestAt = now().getTime();
      const observedAt = now().toISOString();
      const reference = sourceReference(local.agentId);

      try {
        const response = await fetchImpl(
          `${API_BASE_URL}/agents/${local.chainId}/${encodeURIComponent(local.registryAddress)}/${encodeURIComponent(local.agentId)}`,
          {
            headers: {
              accept: "application/json",
              ...(apiKey ? { "X-API-Key": apiKey } : {}),
            },
            redirect: "error",
            signal: AbortSignal.timeout(8_000),
          },
        );

        if (!response.ok) throw new Error(`8004scan request failed with HTTP ${response.status}.`);
        const raw = await readBoundedJson(response);
        const parsed = agentSchema.parse(raw);
        const chainId = Number(parsed.chain_id);
        const agentId = String(parsed.token_id);
        const ownerAddress = normalizeAddress(parsed.owner_address);
        const registryAddress = normalizeAddress(parsed.contract_address);
        const conflictFields = [
          chainId !== local.chainId ? "chainId" : null,
          agentId !== local.agentId ? "agentId" : null,
          registryAddress && registryAddress !== local.registryAddress.toLowerCase()
            ? "registryAddress"
            : null,
          ownerAddress && local.ownerAddress && ownerAddress !== local.ownerAddress.toLowerCase()
            ? "ownerAddress"
            : null,
        ].filter((field): field is string => field !== null);
        const capabilities = [
          ...new Set([
            ...flattenLabels(parsed.categories),
            ...flattenLabels(parsed.tags),
            ...flattenLabels(parsed.services),
            ...flattenLabels(parsed.supported_protocols),
          ]),
        ].slice(0, 50);
        const feedbackCount = optionalNumber(parsed.total_feedbacks);
        const reputationScore = optionalNumber(parsed.average_score);
        const validationCount = optionalNumber(parsed.total_validations);
        const network =
          flattenLabels(parsed.network)[0] ??
          parsed.chain_type ??
          (typeof parsed.is_testnet === "boolean"
            ? parsed.is_testnet
              ? "testnet"
              : "mainnet"
            : null);
        const availability: ScanCrossCheckAvailability =
          conflictFields.length > 0
            ? "conflict"
            : ownerAddress === null &&
                feedbackCount === null &&
                reputationScore === null &&
                validationCount === null &&
                capabilities.length === 0
              ? "field-unavailable"
              : "available";
        const result: ScanCrossCheck = {
          availability,
          capabilities,
          categories: local.categories,
          conflictFields,
          feedbackCount,
          identity: { agentId, chainId, registryAddress },
          name: parsed.name ?? null,
          network,
          observedAt,
          ownerAddress,
          reputationScore,
          source: "8004scan",
          sourceReference: reference,
          validationCount,
        };

        await cache.upsert({
          agent_db_id: local.agentDbId,
          availability,
          conflict_fields: conflictFields,
          expires_at: new Date(now().getTime() + AVAILABLE_CACHE_MS).toISOString(),
          normalized_evidence: {
            agentId,
            capabilities,
            categories: [...local.categories],
            chainId,
            feedbackCount,
            name: result.name,
            network,
            ownerAddress,
            reputationScore,
            registryAddress,
            validationCount,
          },
          observed_at: observedAt,
          provider: "8004scan",
          raw_payload: asJson(raw),
          source_reference: reference,
        });
        return result;
      } catch {
        const result: ScanCrossCheck = {
          availability: "unavailable",
          capabilities: [],
          categories: local.categories,
          conflictFields: [],
          feedbackCount: null,
          identity: null,
          name: null,
          network: null,
          observedAt,
          ownerAddress: null,
          reputationScore: null,
          source: "8004scan",
          sourceReference: reference,
          validationCount: null,
        };

        await cache.upsert({
          agent_db_id: local.agentDbId,
          availability: "unavailable",
          expires_at: new Date(now().getTime() + UNAVAILABLE_CACHE_MS).toISOString(),
          normalized_evidence: {
            agentId: null,
            capabilities: [],
            categories: [...local.categories],
            chainId: null,
            feedbackCount: null,
            name: null,
            network: null,
            ownerAddress: null,
            reputationScore: null,
            validationCount: null,
          },
          observed_at: observedAt,
          provider: "8004scan",
          raw_payload: null,
          source_reference: reference,
        });
        return result;
      }
    },
  };
}

export function createConfigured8004ScanClient() {
  return create8004ScanClient({
    apiKey: process.env.SIFT_8004SCAN_API_KEY,
    forceRefresh: true,
  });
}
