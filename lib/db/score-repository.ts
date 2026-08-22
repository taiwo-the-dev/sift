import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  PersistedSiftScore,
  SiftScoreInput,
} from "@/features/scoring/model";
import { mapHealthRecord } from "@/lib/db/health-repository";
import { getSupabaseServerClient } from "@/lib/db/client";
import type {
  Database,
  Json,
  TableInsert,
  TableRow,
} from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";
import {
  metadataStatuses,
  validateAgentScoreWrite,
  type AgentScoreWriteInput,
} from "@/lib/db/validation";

type AgentRecord = TableRow<"agents">;
type HealthRecord = TableRow<"agent_health">;
type ReputationRecord = TableRow<"agent_reputation">;
type ScoreRecord = TableRow<"agent_scores">;
type ServiceRecord = TableRow<"agent_services">;

export type ScoreRepositorySources = Readonly<{
  listAgentRecords(ids: readonly string[]): Promise<readonly AgentRecord[]>;
  listCandidateIds(
    limit: number,
    scoreVersion: string,
  ): Promise<readonly string[]>;
  listHealthRecords(ids: readonly string[]): Promise<readonly HealthRecord[]>;
  listReputationRecords(
    ids: readonly string[],
  ): Promise<readonly ReputationRecord[]>;
  listServiceRecords(ids: readonly string[]): Promise<readonly ServiceRecord[]>;
  upsertScores(records: readonly TableInsert<"agent_scores">[]): Promise<void>;
}>;

export type ScoreRepository = Readonly<{
  listCandidates(
    limit: number,
    scoreVersion: string,
  ): Promise<readonly SiftScoreInput[]>;
  save(scores: readonly AgentScoreWriteInput[]): Promise<void>;
}>;

function timestampFromJson(value: Json | undefined): string | null {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : null;
}

export function mapScoreRecord(record: ScoreRecord): PersistedSiftScore {
  const freshness =
    typeof record.source_freshness === "object" &&
    record.source_freshness !== null &&
    !Array.isArray(record.source_freshness)
      ? record.source_freshness
      : {};

  return {
    calculatedAt: record.calculated_at,
    components: {
      availability: record.availability_component,
      capability: record.capability_component,
      metadata: record.metadata_component,
      reliability: record.reliability_component,
      reputation: record.reputation_component,
      trackRecord: record.track_record_component,
    },
    confidence: record.confidence,
    score: record.sift_score,
    sourceFreshness: {
      healthAt: timestampFromJson(freshness.healthAt),
      metadataAt: timestampFromJson(freshness.metadataAt),
      reputationAt: timestampFromJson(freshness.reputationAt),
    },
    version: record.score_version,
  };
}

function createSupabaseSources(
  client: SupabaseClient<Database>,
): ScoreRepositorySources {
  return {
    async listCandidateIds(limit, scoreVersion) {
      const { data, error } = await client.rpc(
        "score_recalculation_candidates",
        {
          p_limit: limit,
          p_score_version: scoreVersion,
        },
      );

      if (error) {
        throw new DatabaseOperationError("list score candidates", error);
      }

      return data.map((row) => row.agent_db_id);
    },
    async listAgentRecords(ids) {
      const { data, error } = await client
        .from("agents")
        .select("*")
        .in("id", [...ids]);

      if (error) {
        throw new DatabaseOperationError("list scoring agents", error);
      }

      return data;
    },
    async listHealthRecords(ids) {
      const { data, error } = await client
        .from("agent_health")
        .select("*")
        .in("agent_db_id", [...ids]);

      if (error) {
        throw new DatabaseOperationError("list scoring health", error);
      }

      return data;
    },
    async listReputationRecords(ids) {
      const { data, error } = await client
        .from("agent_reputation")
        .select("*")
        .in("agent_db_id", [...ids]);

      if (error) {
        throw new DatabaseOperationError("list scoring reputation", error);
      }

      return data;
    },
    async listServiceRecords(ids) {
      const { data, error } = await client
        .from("agent_services")
        .select("*")
        .in("agent_db_id", [...ids]);

      if (error) {
        throw new DatabaseOperationError("list scoring services", error);
      }

      return data;
    },
    async upsertScores(records) {
      const { error } = await client
        .from("agent_scores")
        .upsert([...records], { onConflict: "agent_db_id" });

      if (error) {
        throw new DatabaseOperationError("persist Sift Scores", error);
      }
    },
  };
}

export function createScoreRepository(
  sources: ScoreRepositorySources = createSupabaseSources(
    getSupabaseServerClient(),
  ),
): ScoreRepository {
  return {
    async listCandidates(limit, scoreVersion) {
      const ids = await sources.listCandidateIds(limit, scoreVersion);

      if (ids.length === 0) {
        return [];
      }

      const [agents, healthRecords, reputationRecords, serviceRecords] =
        await Promise.all([
          sources.listAgentRecords(ids),
          sources.listHealthRecords(ids),
          sources.listReputationRecords(ids),
          sources.listServiceRecords(ids),
        ]);
      const agentById = new Map(agents.map((agent) => [agent.id, agent]));
      const healthById = new Map(
        healthRecords.map((health) => [
          health.agent_db_id,
          mapHealthRecord(health),
        ]),
      );
      const reputationById = new Map(
        reputationRecords.map((reputation) => [
          reputation.agent_db_id,
          reputation,
        ]),
      );
      const servicesById = new Map<string, ServiceRecord[]>();

      for (const service of serviceRecords) {
        const services = servicesById.get(service.agent_db_id) ?? [];
        services.push(service);
        servicesById.set(service.agent_db_id, services);
      }

      return ids.map((id) => {
        const agent = agentById.get(id);

        if (!agent) {
          throw new DatabaseOperationError(
            "compose score candidates",
            new Error("A queued score candidate no longer exists."),
          );
        }

        const metadataStatus = metadataStatuses.find(
          (status) => status === agent.metadata_status,
        );

        if (!metadataStatus) {
          throw new DatabaseOperationError(
            "compose score candidates",
            new Error("A score candidate has an unsupported metadata status."),
          );
        }

        const reputation = reputationById.get(id);

        return {
          active: agent.active,
          agentDbId: id,
          description: agent.description,
          health: healthById.get(id) ?? null,
          imageUrl: agent.image_url,
          metadataStatus,
          metadataVerifiedAt:
            agent.metadata_verified_at ??
            (metadataStatus === "valid" ? agent.last_synced_at : null),
          name: agent.name,
          ownerAddress: agent.owner_address,
          reputation: reputation
            ? {
                failedJobs: reputation.failed_jobs,
                feedbackCount: reputation.feedback_count,
                reputationScore: reputation.reputation_score,
                source: reputation.source,
                sourceObservedAt: reputation.source_observed_at,
                successfulJobs: reputation.successful_jobs,
              }
            : null,
          services: (servicesById.get(id) ?? []).map((service) => ({
              endpoint: service.endpoint,
              metadata: service.metadata,
              serviceType: service.service_type,
              version: service.version,
            })),
          x402Supported: agent.x402_supported,
        };
      });
    },
    async save(scores) {
      if (scores.length === 0) {
        return;
      }

      await sources.upsertScores(scores.map(validateAgentScoreWrite));
    },
  };
}
