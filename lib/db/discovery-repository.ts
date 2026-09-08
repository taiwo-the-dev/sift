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
import { isHiringAvailabilityQuery } from "@/features/discovery/query";
import { assessHiringCompatibility } from "@/features/hiring/compatibility";
import type {
  CategoryEvidence,
  CategoryFact,
} from "@/features/categories/taxonomy";
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
  Database["public"]["Functions"]["search_agents_with_health"]["Returns"][number];

type RecentAgentRow = Pick<
  TableRow<"agents">,
  | "active"
  | "agent_id"
  | "chain_id"
  | "description"
  | "id"
  | "image_url"
  | "last_synced_at"
  | "metadata_status"
  | "name"
  | "owner_address"
  | "registered_at"
  | "registered_block"
  | "registry_address"
  | "x402_supported"
> & {
  agent_category_evidence: Pick<
    TableRow<"agent_category_evidence">,
    | "category"
    | "confidence"
    | "evidence"
    | "facts"
    | "observed_at"
    | "rule_version"
    | "source"
  >[];
  agent_services: Pick<
    TableRow<"agent_services">,
    "service_type" | "version"
  >[];
};

const recentAgentSelect = `
  id,
  chain_id,
  agent_id,
  registry_address,
  owner_address,
  name,
  description,
  image_url,
  active,
  x402_supported,
  metadata_status,
  registered_block,
  registered_at,
  last_synced_at,
  agent_category_evidence (
    category,
    confidence,
    evidence,
    facts,
    observed_at,
    rule_version,
    source
  ),
  agent_services (
    service_type,
    version
  )
` as const;

export type DiscoveryRepository = Readonly<{
  listRecentlyRegistered(pageSize?: DiscoveryPageSize): Promise<DiscoveryResult>;
  search(query: DiscoveryQuery): Promise<DiscoveryResult>;
}>;

export type DiscoveryEvidenceSources = Readonly<{
  listHealth(ids: readonly string[]): Promise<readonly TableRow<"agent_health">[]>;
  listScores(ids: readonly string[]): Promise<readonly TableRow<"agent_scores">[]>;
  listServices(
    ids: readonly string[],
  ): Promise<readonly Pick<
    TableRow<"agent_services">,
    "agent_db_id" | "endpoint" | "service_type" | "version"
  >[]>;
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
        endpoint: typeof entry.endpoint === "string" ? entry.endpoint : null,
        serviceType: entry.serviceType,
        version: typeof entry.version === "string" ? entry.version : null,
      },
    ];
  });
}

function mapCategorySource(value: string | null): CategorySource {
  return value === "declared-metadata" || value === "deterministic-rule"
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

function mapCategoryEvidence(value: Json): readonly CategoryEvidence[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const category = isRecord(item) && typeof item.category === "string"
      ? discoveryCategorySlugs.find((candidate) => candidate === item.category)
      : undefined;
    if (
      !isRecord(item) ||
      !category ||
      typeof item.confidence !== "number" ||
      typeof item.observedAt !== "string" ||
      typeof item.ruleVersion !== "string" ||
      (item.source !== "declared-metadata" && item.source !== "deterministic-rule")
    ) {
      return [];
    }

    const facts = Array.isArray(item.facts)
      ? item.facts.flatMap((fact) => {
          if (
            !isRecord(fact) ||
            typeof fact.key !== "string" ||
            typeof fact.label !== "string" ||
            typeof fact.sourceField !== "string" ||
            typeof fact.value !== "string"
          ) {
            return [];
          }

          return [fact as CategoryFact];
        })
      : [];
    const matchedTerms = Array.isArray(item.matchedTerms)
      ? item.matchedTerms.filter(
          (term): term is string => typeof term === "string",
        )
      : [];

    return [
      {
        category,
        confidence: item.confidence,
        facts,
        matchedTerms,
        observedAt: item.observedAt,
        ruleVersion: item.ruleVersion as CategoryEvidence["ruleVersion"],
        source: item.source,
      },
    ];
  });
}

function mapAgent(row: SearchAgentRow): DiscoveryAgent {
  return {
    active: row.active,
    agentDbId: row.agent_db_id,
    agentId: row.agent_id,
    categories: mapCategories(row.resolved_categories),
    categoryEvidence: mapCategoryEvidence(row.category_evidence),
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

function mapRecentAgent(row: RecentAgentRow): DiscoveryAgent {
  const categoryEvidence = mapCategoryEvidence(
    row.agent_category_evidence.map((evidence) => ({
      category: evidence.category,
      confidence: evidence.confidence,
      facts: evidence.facts,
      matchedTerms:
        isRecord(evidence.evidence) &&
        Array.isArray(evidence.evidence.matchedTerms)
          ? evidence.evidence.matchedTerms
          : [],
      observedAt: evidence.observed_at,
      ruleVersion: evidence.rule_version,
      source: evidence.source,
    })),
  );
  const categories = discoveryCategorySlugs.filter((category) =>
    categoryEvidence.some((evidence) => evidence.category === category),
  );
  const categorySource = categoryEvidence.some(
    (evidence) => evidence.source === "declared-metadata",
  )
    ? "declared-metadata"
    : categoryEvidence.some(
          (evidence) => evidence.source === "deterministic-rule",
        )
      ? "deterministic-rule"
      : null;

  return {
    active: row.active,
    agentDbId: row.id,
    agentId: row.agent_id,
    categories,
    categoryEvidence,
    categorySource,
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
    relevance: 0,
    score: null,
    services: row.agent_services.map((service) => ({
      endpoint: null,
      serviceType: service.service_type,
      version: service.version,
    })),
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
    async listServices(ids) {
      const { data, error } = await client
        .from("agent_services")
        .select("agent_db_id,endpoint,service_type,version")
        .in("agent_db_id", [...ids]);

      if (error) {
        throw new DatabaseOperationError("list discovery services", error);
      }

      return data;
    },
  },
): DiscoveryRepository {
  async function attachEvidence(
    agents: readonly DiscoveryAgent[],
  ): Promise<DiscoveryAgent[]> {
    const ids = agents.map((agent) => agent.agentDbId);
    const [healthRecords, scoreRecords, serviceRecords] =
      ids.length > 0
        ? await Promise.all([
            evidenceSources.listHealth(ids),
            evidenceSources.listScores(ids),
            evidenceSources.listServices(ids),
          ])
        : [[], [], []];
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
    const servicesById = new Map<string, DiscoveryService[]>();

    for (const service of serviceRecords) {
      const services = servicesById.get(service.agent_db_id) ?? [];
      services.push({
        endpoint: service.endpoint,
        serviceType: service.service_type,
        version: service.version,
      });
      servicesById.set(service.agent_db_id, services);
    }

    return agents.map((agent) => ({
      ...agent,
      health: healthById.get(agent.agentDbId) ?? null,
      score: scoreById.get(agent.agentDbId) ?? null,
      services: servicesById.get(agent.agentDbId) ?? agent.services,
    }));
  }

  async function searchRecentAgents(
    query: DiscoveryQuery,
  ): Promise<DiscoveryResult> {
    const offset = (query.page - 1) * query.pageSize;
    let request = client.from("agents").select(recentAgentSelect);

    request =
      query.networkChainIds.length === 1
        ? request.eq("chain_id", query.networkChainIds[0]!)
        : request.in("chain_id", [...query.networkChainIds]);

    if (query.metadataStatuses.length > 0) {
      request = request.in("metadata_status", [...query.metadataStatuses]);
    }

    const { data, error } = await request
      .order("registered_block", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true })
      .range(offset, offset + query.pageSize);

    if (error) {
      throw new DatabaseOperationError("list recent indexed agents", error);
    }

    const hasNextPage = data.length > query.pageSize;
    const agents = await attachEvidence(
      data.slice(0, query.pageSize).map(mapRecentAgent),
    );

    return {
      agents,
      hasNextPage,
      page: query.page,
      pageSize: query.pageSize,
      totalCount: null,
    };
  }

  async function searchDatabasePage(
    query: DiscoveryQuery,
  ): Promise<DiscoveryResult> {
    if (
      query.sort === "recent" &&
      query.effectiveCategories.length === 0 &&
      query.healthStatuses.length === 0 &&
      query.searchTerms.length === 0
    ) {
      return searchRecentAgents(query);
    }

    const functionName =
      query.healthStatuses.length > 0
        ? "search_agents_with_health"
        : "search_agents";
    const sharedParameters = {
      p_categories: [...query.effectiveCategories],
      p_chain_ids: [...query.networkChainIds],
      p_metadata_statuses: [...query.metadataStatuses],
      p_page: query.page,
      p_page_size: query.pageSize,
      p_search_terms: [...query.searchTerms],
      p_sort: query.sort,
    };
    const { data, error } =
      functionName === "search_agents_with_health"
        ? await client.rpc(functionName, {
            ...sharedParameters,
            p_health_statuses: [...query.healthStatuses],
          })
        : await client.rpc(functionName, sharedParameters);

    if (error) {
      throw new DatabaseOperationError("search indexed agents", error);
    }

    const firstRow = data[0];
    const page = firstRow?.result_page ?? query.page;
    const agents = await attachEvidence(data.map(mapAgent));

    return {
      agents,
      hasNextPage: firstRow?.has_more ?? false,
      page,
      pageSize: query.pageSize,
      totalCount: null,
    };
  }

  async function searchHiringAvailableAgents(
    query: DiscoveryQuery,
  ): Promise<DiscoveryResult> {
    const firstRequestedIndex = (query.page - 1) * query.pageSize;
    const endRequestedIndex = firstRequestedIndex + query.pageSize;
    const requiredEligibleAgents = endRequestedIndex + 1;
    const eligibleAgents: DiscoveryAgent[] = [];
    const sourcePageSize: DiscoveryPageSize = 36;
    let sourceHasMore = true;
    let sourcePage = 1;

    while (
      sourceHasMore &&
      eligibleAgents.length < requiredEligibleAgents &&
      sourcePage <= 10_000
    ) {
      const sourceResult = await searchDatabasePage({
        ...query,
        page: sourcePage,
        pageSize: sourcePageSize,
      });

      eligibleAgents.push(
        ...sourceResult.agents.filter(
          (agent) => assessHiringCompatibility(agent).compatibility !== null,
        ),
      );
      sourceHasMore = sourceResult.hasNextPage;
      sourcePage += 1;
    }

    return {
      agents: eligibleAgents.slice(firstRequestedIndex, endRequestedIndex),
      hasNextPage: eligibleAgents.length > endRequestedIndex,
      page: query.page,
      pageSize: query.pageSize,
      totalCount: null,
    };
  }

  function search(query: DiscoveryQuery): Promise<DiscoveryResult> {
    return isHiringAvailabilityQuery(query)
      ? searchHiringAvailableAgents(query)
      : searchDatabasePage(query);
  }

  return {
    listRecentlyRegistered(pageSize = 12) {
      return search({
        categories: [],
        effectiveCategories: [],
        healthStatuses: [],
        inferredCategory: null,
        metadataStatuses: [],
        network: "bsc-mainnet",
        networkChainIds: [56],
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
