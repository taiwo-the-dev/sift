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

function mapService(value: Json): NormalizedService | null {
  if (!isRecord(value) || typeof value.serviceType !== "string") return null;

  return {
    endpoint: typeof value.endpoint === "string" ? value.endpoint : null,
    metadata: value.metadata ?? null,
    serviceType: value.serviceType,
    version: typeof value.version === "string" ? value.version : null,
  };
}

function mapServices(value: Json): readonly NormalizedService[] {
  return Array.isArray(value)
    ? value.flatMap((service) => {
        const mapped = mapService(service);
        return mapped ? [mapped] : [];
      })
    : [];
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
      const { data, error } = await client.rpc("category_classification_candidates", {
        p_after: after,
        p_chain_id: chainId,
        p_limit: limit,
      });

      if (error) {
        throw new DatabaseOperationError("list category candidates", error);
      }

      return data.map((row) => ({
        agentDbId: row.agent_db_id,
        agentId: row.agent_id,
        declaredCategory: row.declared_category,
        description: row.description,
        sourceObservedAt: row.source_observed_at,
        name: row.name,
        services: mapServices(row.services),
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

      if (error) {
        throw new DatabaseOperationError("persist category shortlist", error);
      }
    },
  };
}
