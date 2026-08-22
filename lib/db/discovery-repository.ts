import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  discoveryCategorySlugs,
  type CategorySource,
  type DiscoveryAgent,
  type DiscoveryCategory,
  type DiscoveryPageSize,
  type DiscoveryQuery,
  type DiscoveryResult,
  type DiscoveryService,
} from "@/features/discovery/model";
import { getSupabaseServerClient } from "@/lib/db/client";
import type { Database, Json, TableRow } from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";
import { mapHealthRecord } from "@/lib/db/health-repository";
import { mapScoreRecord } from "@/lib/db/score-repository";
import {
  metadataStatuses,
  type MetadataStatus,
} from "@/lib/db/validation";

type SearchAgentRow =
  Database["public"]["Functions"]["search_agents"]["Returns"][number];

export type DiscoveryRepository = Readonly<{
  listRecentlyRegistered(pageSize?: DiscoveryPageSize): Promise<DiscoveryResult>;
  search(query: DiscoveryQuery): Promise<DiscoveryResult>;
}>;

export type DiscoveryEvidenceSources = Readonly<{
  listHealth(ids: readonly string[]): Promise<readonly TableRow<"agent_health">[]>;
  listScores(ids: readonly string[]): Promise<readonly TableRow<"agent_scores">[]>;
}>;

function isRecord(value: Json): value is Readonly<Record<string, Json | undefined>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapServices(value: Json): readonly DiscoveryService[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (!isRecord(entry) || typeof entry.serviceType !== "string") {
      return [];
    }

    return [
      {
        serviceType: entry.serviceType,
        version: typeof entry.version === "string" ? entry.version : null,
      },
    ];
  });
}

function mapCategorySource(value: string | null): CategorySource {
  return value === "indexed-metadata" || value === "deterministic-keyword"
    ? value
    : null;
}

function mapCategories(values: readonly string[]): readonly DiscoveryCategory[] {
  const supported = new Set<string>(discoveryCategorySlugs);
  return values.filter((value): value is DiscoveryCategory =>
    supported.has(value),
  );
}

function mapMetadataStatus(value: string): MetadataStatus {
  const supported = metadataStatuses.find((status) => status === value);

  if (!supported) {
    throw new DatabaseOperationError(
      "map discovery metadata status",
      new TypeError("The database returned an unsupported metadata status."),
    );
  }

  return supported;
}

function mapAgent(row: SearchAgentRow): DiscoveryAgent {
  return {
    active: row.active,
    agentDbId: row.agent_db_id,
    agentId: row.agent_id,
    categories: mapCategories(row.resolved_categories),
    categorySource: mapCategorySource(row.category_source),
    chainId: row.chain_id,
    description: row.description,
    health: null,
    imageUrl: row.image_url,
    lastSyncedAt: row.last_synced_at,
    metadataStatus: mapMetadataStatus(row.metadata_status),
    name: row.name,
    ownerAddress: row.owner_address,
    registeredAt: row.registered_at,
    registeredBlock: row.registered_block,
    registryAddress: row.registry_address,
    relevance: row.relevance,
    score: null,
    services: mapServices(row.services),
    x402Supported: row.x402_supported,
  };
}

export function createDiscoveryRepository(
  client: SupabaseClient<Database> = getSupabaseServerClient(),
  evidenceSources: DiscoveryEvidenceSources = {
    async listHealth(ids) {
      const { data, error } = await client
        .from("agent_health")
        .select("*")
        .in("agent_db_id", [...ids]);

      if (error) {
        throw new DatabaseOperationError("list discovery health", error);
      }

      return data;
    },
    async listScores(ids) {
      const { data, error } = await client
        .from("agent_scores")
        .select("*")
        .in("agent_db_id", [...ids]);

      if (error) {
        throw new DatabaseOperationError("list discovery scores", error);
      }

      return data;
    },
  },
): DiscoveryRepository {
  async function search(query: DiscoveryQuery): Promise<DiscoveryResult> {
    const { data, error } = await client.rpc("search_agents", {
      p_categories: [...query.effectiveCategories],
      p_metadata_statuses: [...query.metadataStatuses],
      p_page: query.page,
      p_page_size: query.pageSize,
      p_search_terms: [...query.searchTerms],
      p_sort: query.sort,
    });

    if (error) {
      throw new DatabaseOperationError("search indexed agents", error);
    }

    const firstRow = data[0];
    const totalCount = firstRow?.total_count ?? 0;
    const page = firstRow?.result_page ?? 1;
    const agents = data.map(mapAgent);
    const ids = agents.map((agent) => agent.agentDbId);
    const [healthRecords, scoreRecords] =
      ids.length > 0
        ? await Promise.all([
            evidenceSources.listHealth(ids),
            evidenceSources.listScores(ids),
          ])
        : [[], []];
    const healthById = new Map(
      healthRecords.map((record) => [
        record.agent_db_id,
        mapHealthRecord(record),
      ]),
    );
    const scoreById = new Map(
      scoreRecords.map((record) => [
        record.agent_db_id,
        mapScoreRecord(record),
      ]),
    );

    return {
      agents: agents.map((agent) => ({
        ...agent,
        health: healthById.get(agent.agentDbId) ?? null,
        score: scoreById.get(agent.agentDbId) ?? null,
      })),
      page,
      pageSize: query.pageSize,
      totalCount,
      totalPages: Math.max(1, Math.ceil(totalCount / query.pageSize)),
    };
  }

  return {
    listRecentlyRegistered(pageSize = 12) {
      return search({
        categories: [],
        effectiveCategories: [],
        inferredCategory: null,
        metadataStatuses: [],
        page: 1,
        pageSize,
        query: "",
        searchTerms: [],
        sort: "recent",
      });
    },
    search,
  };
}
