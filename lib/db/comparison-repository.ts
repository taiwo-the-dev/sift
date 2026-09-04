import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  parseComparisonSelection,
  serializeAgentReference,
} from "@/features/comparison/query";
import type {
  AgentReference,
  ComparisonResult,
} from "@/features/comparison/model";
import {
  composeAgentProfile,
} from "@/lib/db/agent-profile-repository";
import { getSupabaseServerClient } from "@/lib/db/client";
import type { Database, TableRow } from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";

type AgentRecord = TableRow<"agents">;
type AgentHealthRecord = TableRow<"agent_health">;
type AgentReputationRecord = TableRow<"agent_reputation">;
type AgentServiceRecord = TableRow<"agent_services">;
type AgentScoreRecord = TableRow<"agent_scores">;
type CategoryEvidenceRecord = TableRow<"agent_category_evidence">;
type ExternalEvidenceRecord = TableRow<"agent_external_evidence">;

export type ComparisonSources = Readonly<{
  listAgents(
    references: readonly AgentReference[],
  ): Promise<readonly AgentRecord[]>;
  listCategoryEvidence?(
    agentDbIds: readonly string[],
  ): Promise<readonly CategoryEvidenceRecord[]>;
  listExternalEvidence?(
    agentDbIds: readonly string[],
  ): Promise<readonly ExternalEvidenceRecord[]>;
  listHealth(agentDbIds: readonly string[]): Promise<readonly AgentHealthRecord[]>;
  listReputation(
    agentDbIds: readonly string[],
  ): Promise<readonly AgentReputationRecord[]>;
  listScores(agentDbIds: readonly string[]): Promise<readonly AgentScoreRecord[]>;
  listServices(
    agentDbIds: readonly string[],
  ): Promise<readonly AgentServiceRecord[]>;
}>;

export type ComparisonRepository = Readonly<{
  findByReferences(
    references: readonly AgentReference[],
  ): Promise<ComparisonResult>;
}>;

function createSupabaseSources(
  client: SupabaseClient<Database>,
): ComparisonSources {
  return {
    async listAgents(references) {
      const exactIdentityFilter = references
        .map(
          (reference) =>
            `and(chain_id.eq.${reference.chainId},agent_id.eq.${reference.agentId})`,
        )
        .join(",");
      const { data, error } = await client
        .from("agents")
        .select("*")
        .or(exactIdentityFilter)
        .limit(32);

      if (error) {
        throw new DatabaseOperationError("list comparison agents", error);
      }

      return data;
    },
    async listHealth(agentDbIds) {
      const { data, error } = await client
        .from("agent_health")
        .select("*")
        .in("agent_db_id", [...agentDbIds]);

      if (error) {
        throw new DatabaseOperationError("list comparison health", error);
      }

      return data;
    },
    async listCategoryEvidence(agentDbIds) {
      const { data, error } = await client
        .from("agent_category_evidence")
        .select("*")
        .in("agent_db_id", [...agentDbIds]);

      if (error) {
        throw new DatabaseOperationError("list comparison category evidence", error);
      }

      return data;
    },
    async listExternalEvidence(agentDbIds) {
      const { data, error } = await client
        .from("agent_external_evidence")
        .select("*")
        .in("agent_db_id", [...agentDbIds])
        .eq("provider", "8004scan");

      if (error) {
        // Optional enrichment must never make core comparison unavailable.
        return [];
      }

      return data;
    },
    async listReputation(agentDbIds) {
      const { data, error } = await client
        .from("agent_reputation")
        .select("*")
        .in("agent_db_id", [...agentDbIds]);

      if (error) {
        throw new DatabaseOperationError("list comparison reputation", error);
      }

      return data;
    },
    async listScores(agentDbIds) {
      const { data, error } = await client
        .from("agent_scores")
        .select("*")
        .in("agent_db_id", [...agentDbIds]);

      if (error) {
        throw new DatabaseOperationError("list comparison scores", error);
      }

      return data;
    },
    async listServices(agentDbIds) {
      const { data, error } = await client
        .from("agent_services")
        .select("*")
        .in("agent_db_id", [...agentDbIds])
        .order("created_at", { ascending: true });

      if (error) {
        throw new DatabaseOperationError("list comparison services", error);
      }

      return data;
    },
  };
}

function groupByAgentDbId<RecordType extends { agent_db_id: string }>(
  records: readonly RecordType[],
): ReadonlyMap<string, readonly RecordType[]> {
  const grouped = new Map<string, RecordType[]>();

  for (const record of records) {
    const existing = grouped.get(record.agent_db_id) ?? [];
    existing.push(record);
    grouped.set(record.agent_db_id, existing);
  }

  return grouped;
}

export function createComparisonRepository(
  sources: ComparisonSources = createSupabaseSources(
    getSupabaseServerClient(),
  ),
): ComparisonRepository {
  return {
    async findByReferences(references) {
      const validatedReferences = parseComparisonSelection(
        references.map(serializeAgentReference),
      ).references;

      if (validatedReferences.length === 0) {
        return { agents: [], missingAgents: [] };
      }

      const requestedKeys = new Set(
        validatedReferences.map(serializeAgentReference),
      );
      const candidateAgents = (
        await sources.listAgents(validatedReferences)
      ).filter((agent) =>
        requestedKeys.has(
          serializeAgentReference({
            agentId: agent.agent_id,
            chainId: agent.chain_id,
          }),
        ),
      );
      const agentsByReference = new Map<string, AgentRecord[]>();

      for (const agent of candidateAgents) {
        const key = serializeAgentReference({
          agentId: agent.agent_id,
          chainId: agent.chain_id,
        });
        const existing = agentsByReference.get(key) ?? [];
        existing.push(agent);
        agentsByReference.set(key, existing);
      }

      const uniqueAgents = validatedReferences.flatMap((reference) => {
        const candidates = agentsByReference.get(
          serializeAgentReference(reference),
        );
        return candidates?.length === 1 ? candidates : [];
      });
      const agentDbIds = uniqueAgents.map((agent) => agent.id);
      const [
        services,
        health,
        reputation,
        scores,
        categoryEvidence,
        externalEvidence,
      ] =
        agentDbIds.length > 0
          ? await Promise.all([
              sources.listServices(agentDbIds),
              sources.listHealth(agentDbIds),
              sources.listReputation(agentDbIds),
              sources.listScores(agentDbIds),
              sources.listCategoryEvidence?.(agentDbIds) ?? Promise.resolve([]),
              sources.listExternalEvidence?.(agentDbIds) ?? Promise.resolve([]),
            ])
          : [[], [], [], [], [], []];
      const servicesByAgent = groupByAgentDbId(services);
      const healthByAgent = new Map(
        health.map((record) => [record.agent_db_id, record]),
      );
      const reputationByAgent = new Map(
        reputation.map((record) => [record.agent_db_id, record]),
      );
      const scoresByAgent = new Map(
        scores.map((record) => [record.agent_db_id, record]),
      );
      const categoryEvidenceByAgent = groupByAgentDbId(categoryEvidence);
      const externalEvidenceByAgent = new Map(
        externalEvidence.map((record) => [record.agent_db_id, record]),
      );
      const agentByKey = new Map(
        uniqueAgents.map((agent) => [
          serializeAgentReference({
            agentId: agent.agent_id,
            chainId: agent.chain_id,
          }),
          agent,
        ]),
      );

      return {
        agents: validatedReferences.flatMap((reference) => {
          const agent = agentByKey.get(serializeAgentReference(reference));

          return agent
            ? [
                composeAgentProfile(
                  agent,
                  servicesByAgent.get(agent.id) ?? [],
                  healthByAgent.get(agent.id) ?? null,
                  reputationByAgent.get(agent.id) ?? null,
                  scoresByAgent.get(agent.id) ?? null,
                  categoryEvidenceByAgent.get(agent.id) ?? [],
                  externalEvidenceByAgent.get(agent.id) ?? null,
                ),
              ]
            : [];
        }),
        missingAgents: validatedReferences.flatMap((reference) => {
          const candidates = agentsByReference.get(
            serializeAgentReference(reference),
          );

          if (candidates?.length === 1) {
            return [];
          }

          return [
            {
              reason: candidates && candidates.length > 1
                ? "ambiguous" as const
                : "not-found" as const,
              reference,
            },
          ];
        }),
      };
    },
  };
}
