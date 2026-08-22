import type { Json } from "@/lib/db/database.types";
import type { AgentMetadata } from "@/lib/indexer/metadata/schema";

export type NormalizedService = Readonly<{
  endpoint: string | null;
  metadata: Json | null;
  serviceType: string;
  version: string | null;
}>;

export type NormalizedAgentMetadata = Readonly<{
  active: boolean | null;
  description: string | null;
  imageUrl: string | null;
  name: string;
  services: readonly NormalizedService[];
  x402Supported: boolean | null;
}>;

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

export function normalizeAgentMetadata(
  metadata: AgentMetadata,
): NormalizedAgentMetadata {
  const services = (metadata.services ?? metadata.endpoints ?? []).map((service) => {
    const { endpoint, name, version, ...extra } = service;
    const extraKeys = Object.keys(extra);

    return {
      endpoint: endpoint || null,
      metadata: extraKeys.length === 0 ? null : asJson(extra),
      serviceType: name,
      version: version ?? null,
    };
  });

  return {
    active: metadata.active ?? null,
    description: metadata.description || null,
    imageUrl: metadata.image || null,
    name: metadata.name,
    services,
    x402Supported: metadata.x402Support ?? null,
  };
}
