import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CATEGORY_TAXONOMY_VERSION,
  categorySlugs,
  type CategoryEvidence,
  type CategoryEvidenceSource,
  type CategoryFact,
  type CategorySlug,
} from "@/features/categories/taxonomy";
import { getSupabaseServerClient } from "@/lib/db/client";
import type { Database, Json, TableInsert, TableRow } from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";
import type { NormalizedService } from "@/lib/indexer/metadata/normalize";

type CategoryEvidenceRecord = TableRow<"agent_category_evidence">;

const categoryServiceQueryBatchSize = 100;

export type CategoryCandidate = Readonly<{
  agentDbId: string;
  agentId: string;
  declaredCategory: string | null;
  description: string | null;
  sourceObservedAt: string;
  name: string | null;
  services: readonly NormalizedService[];
}>;

export type CategoryCoverage = Readonly<{
  activationAvailable: number;
  category: CategorySlug;
  externalCrossChecks: number;
  inventory: number;
  latestObservedAt: string | null;
  shortlistCount: number;
  validMetadata: number;
  withEndpoint: number;
  withHealth: number;
  withImage: number;
  withReputation: number;
  withScore: number;
  withServices: number;
}>;

export type CategoryShortlistRecord = TableRow<"agent_category_shortlist">;

export type CategoryRepository = Readonly<{
  listCandidatePage(
    chainId: number,
    after: string | null,
    limit: number,
  ): Promise<readonly CategoryCandidate[]>;
  listCoverage(chainId?: number): Promise<readonly CategoryCoverage[]>;
  listAgentRecords(agentDbIds: readonly string[]): Promise<readonly TableRow<"agents">[]>;
  listEvidence(agentDbIds: readonly string[]): Promise<readonly CategoryEvidenceRecord[]>;
  listShortlist(): Promise<readonly CategoryShortlistRecord[]>;
  replaceEvidence(
    agentDbId: string,
    evidence: readonly CategoryEvidence[],
  ): Promise<void>;
  replaceEvidenceBatch(
    records: readonly Readonly<{
      agentDbId: string;
      evidence: readonly CategoryEvidence[];
    }>[],
  ): Promise<void>;
  replaceShortlist(
    records: readonly TableInsert<"agent_category_shortlist">[],
  ): Promise<void>;
}>;

function isRecord(value: Json): value is Readonly<Record<string, Json | undefined>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mapStoredService(
  service: Pick<
    TableRow<"agent_services">,
    "endpoint" | "metadata" | "service_type" | "version"
  >,
): NormalizedService {
  return {
    endpoint: service.endpoint,
    metadata: service.metadata,
    serviceType: service.service_type,
    version: service.version,
  };
}

function chunkValues<T>(values: readonly T[], size: number): readonly T[][] {
  const chunks: T[][] = [];

  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }

  return chunks;
}

function toEvidenceInsert(
  agentDbId: string,
  evidence: CategoryEvidence,
): TableInsert<"agent_category_evidence"> {
  return {
    agent_db_id: agentDbId,
    category: evidence.category,
    confidence: evidence.confidence,
    evidence: { matchedTerms: [...evidence.matchedTerms] },
    facts: [...evidence.facts] as Json,
    observed_at: evidence.observedAt,
    rule_version: evidence.ruleVersion,
    source: evidence.source,
  };
}

function isCategory(value: string): value is CategorySlug {
  return categorySlugs.some((category) => category === value);
}

function isSource(value: string): value is CategoryEvidenceSource {
  return value === "declared-metadata" || value === "deterministic-rule";
}

function mapFact(value: Json): CategoryFact | null {
  if (
    !isRecord(value) ||
    typeof value.key !== "string" ||
    typeof value.label !== "string" ||
    typeof value.sourceField !== "string" ||
    typeof value.value !== "string" ||
    !["asset", "behavior", "market", "position", "protocol", "service"].includes(
      value.key,
    )
  ) {
    return null;
  }

  return value as CategoryFact;
}

export function mapCategoryEvidenceRecord(
  record: CategoryEvidenceRecord,
): CategoryEvidence {
  if (!isCategory(record.category) || !isSource(record.source)) {
    throw new DatabaseOperationError(
      "map category evidence",
      new TypeError("The database returned unsupported category evidence."),
    );
  }

  const matchedTerms = isRecord(record.evidence) && Array.isArray(record.evidence.matchedTerms)
    ? record.evidence.matchedTerms.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  const facts = Array.isArray(record.facts)
    ? record.facts.flatMap((value) => {
        const fact = mapFact(value);
        return fact ? [fact] : [];
      })
    : [];

  return {
    category: record.category,
    confidence: record.confidence,
    facts,
    matchedTerms,
    observedAt: record.observed_at,
    ruleVersion: record.rule_version as typeof CATEGORY_TAXONOMY_VERSION,
    source: record.source,
  };
}

export function createCategoryRepository(
  client: SupabaseClient<Database> = getSupabaseServerClient(),
): CategoryRepository {
  async function replaceEvidenceRecords(
    agentDbIds: readonly string[],
    records: readonly TableInsert<"agent_category_evidence">[],
  ): Promise<void> {
    if (agentDbIds.length === 0) return;
    const { error } = await client.rpc("replace_agent_category_evidence", {
      p_agent_ids: [...agentDbIds],
      p_records: [...records] as Json,
    });

    if (error) {
      throw new DatabaseOperationError("replace category evidence", error);
    }
  }

  return {
    async listAgentRecords(agentDbIds) {
      if (agentDbIds.length === 0) return [];
      const { data, error } = await client
        .from("agents")
        .select("*")
        .in("id", [...agentDbIds]);

      if (error) {
        throw new DatabaseOperationError("list category agents", error);
      }

      return data;
    },
    async listCandidatePage(chainId, after, limit) {
      const resolvedChainId = chainId === 97 ? 97 : 56;
      const resolvedLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
      let candidateQuery = client
        .from("agents")
        .select(
          "id,agent_id,category,name,description,metadata_verified_at,last_synced_at,updated_at",
        )
        .eq("chain_id", resolvedChainId)
        .eq("metadata_status", "valid");

      if (after) {
        candidateQuery = candidateQuery.gt("id", after);
      }

      const { data, error } = await candidateQuery
        .order("id", { ascending: true })
        .limit(resolvedLimit);

      if (error) {
        throw new DatabaseOperationError("list category candidates", error);
      }

      if (data.length === 0) return [];

      const agentDbIds = data.map((row) => row.id);
      const serviceResults = await Promise.all(
        chunkValues(agentDbIds, categoryServiceQueryBatchSize).map((batch) =>
          client
            .from("agent_services")
            .select(
              "agent_db_id,endpoint,metadata,service_type,version,created_at,id",
            )
            .in("agent_db_id", batch)
            .order("created_at", { ascending: true })
            .order("id", { ascending: true }),
        ),
      );
      const servicesByAgent = new Map<string, NormalizedService[]>();

      for (const result of serviceResults) {
        if (result.error) {
          throw new DatabaseOperationError(
            "list category candidate services",
            result.error,
          );
        }

        for (const service of result.data) {
          const current = servicesByAgent.get(service.agent_db_id) ?? [];
          current.push(mapStoredService(service));
          servicesByAgent.set(service.agent_db_id, current);
        }
      }

      return data.map((row) => ({
        agentDbId: row.id,
        agentId: row.agent_id,
        declaredCategory: row.category,
        description: row.description,
        sourceObservedAt:
          row.metadata_verified_at ?? row.last_synced_at ?? row.updated_at,
        name: row.name,
        services: servicesByAgent.get(row.id) ?? [],
      }));
    },
    async listCoverage(chainId = 56) {
      const { data, error } = await client.rpc("category_coverage_report", {
        p_chain_id: chainId,
      });

      if (error) {
        throw new DatabaseOperationError("read category coverage", error);
      }

      return data.flatMap((row) =>
        isCategory(row.category)
          ? [
              {
                activationAvailable: row.activation_available,
                category: row.category,
                externalCrossChecks: row.external_cross_checks,
                inventory: row.inventory,
                latestObservedAt: row.latest_observed_at,
                shortlistCount: row.shortlist_count,
                validMetadata: row.valid_metadata,
                withEndpoint: row.with_endpoint,
                withHealth: row.with_health,
                withImage: row.with_image,
                withReputation: row.with_reputation,
                withScore: row.with_score,
                withServices: row.with_services,
              },
            ]
          : [],
      );
    },
    async listEvidence(agentDbIds) {
      if (agentDbIds.length === 0) return [];
      const { data, error } = await client
        .from("agent_category_evidence")
        .select("*")
        .in("agent_db_id", [...agentDbIds])
        .order("category", { ascending: true });

      if (error) {
        throw new DatabaseOperationError("list category evidence", error);
      }

      return data;
    },
    async listShortlist() {
      const { data, error } = await client
        .from("agent_category_shortlist")
        .select("*")
        .order("category", { ascending: true })
        .order("shortlist_rank", { ascending: true });

      if (error) {
        throw new DatabaseOperationError("list category shortlist", error);
      }

      return data;
    },
    async replaceEvidence(agentDbId, evidence) {
      await replaceEvidenceRecords(
        [agentDbId],
        evidence.map((item) => toEvidenceInsert(agentDbId, item)),
      );
    },
    async replaceEvidenceBatch(records) {
      await replaceEvidenceRecords(
        records.map((record) => record.agentDbId),
        records.flatMap((record) =>
          record.evidence.map((item) => toEvidenceInsert(record.agentDbId, item)),
        ),
      );
    },
    async replaceShortlist(records) {
      const { error } = await client.rpc("replace_agent_category_shortlist", {
        p_records: [...records] as Json,
      });

      if (!error) return;

      // Older hosted projects may still have the first M14 function, whose
      // unfiltered DELETE is rejected by Supabase's safe-update guard. Bootstrap
      // an empty table once; non-empty replacements continue to fail closed
      // until the forward migration is applied so stale rows are never hidden.
      if (error.code === "21000") {
        const { count, error: countError } = await client
          .from("agent_category_shortlist")
          .select("category", { count: "exact", head: true });

        if (countError) {
          throw new DatabaseOperationError(
            "inspect category shortlist",
            countError,
          );
        }

        if (count === 0) {
          const { error: insertError } = await client
            .from("agent_category_shortlist")
            .insert([...records]);

          if (insertError) {
            throw new DatabaseOperationError(
              "bootstrap category shortlist",
              insertError,
            );
          }

          return;
        }
      }

      throw new DatabaseOperationError("persist category shortlist", error);
    },
  };
}
