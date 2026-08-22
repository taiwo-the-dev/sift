import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AgentProfile,
  AgentProfileService,
  AgentReputationEvidence,
} from "@/features/agents/model";
import { resolveProfileCategories } from "@/features/agents/presentation";
import { getSupabaseServerClient } from "@/lib/db/client";
import type { Database, TableRow } from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";
import { mapHealthRecord } from "@/lib/db/health-repository";
import { mapScoreRecord } from "@/lib/db/score-repository";
import {
  agentCategories,
  metadataStatuses,
  type AgentCategory,
  type MetadataStatus,
} from "@/lib/db/validation";

type AgentRecord = TableRow<"agents">;
type AgentHealthRecord = TableRow<"agent_health">;
type AgentReputationRecord = TableRow<"agent_reputation">;
type AgentServiceRecord = TableRow<"agent_services">;
type AgentScoreRecord = TableRow<"agent_scores">;

export type AgentProfileSources = Readonly<{
  findAgent(chainId: number, agentId: string): Promise<AgentRecord | null>;
  findHealth(agentDbId: string): Promise<AgentHealthRecord | null>;
  findReputation(agentDbId: string): Promise<AgentReputationRecord | null>;
  findScore(agentDbId: string): Promise<AgentScoreRecord | null>;
  listServices(agentDbId: string): Promise<readonly AgentServiceRecord[]>;
}>;

export type AgentProfileRepository = Readonly<{
  findByIdentity(chainId: number, agentId: string): Promise<AgentProfile | null>;
}>;

function mapMetadataStatus(value: string): MetadataStatus {
  const status = metadataStatuses.find((candidate) => candidate === value);

  if (!status) {
    throw new DatabaseOperationError(
      "map agent profile metadata status",
      new TypeError("The database returned an unsupported metadata status."),
    );
  }

  return status;
}

function mapCategory(value: string | null): AgentCategory | null {
  return agentCategories.find((candidate) => candidate === value) ?? null;
}

function mapReputation(
  record: AgentReputationRecord | null,
): AgentReputationEvidence | null {
  return record
    ? {
        failedJobs: record.failed_jobs,
        feedbackCount: record.feedback_count,
        lastActivityAt: record.last_activity_at,
        reputationScore: record.reputation_score,
        source: record.source,
        sourceObservedAt: record.source_observed_at,
        successfulJobs: record.successful_jobs,
        updatedAt: record.updated_at,
      }
    : null;
}

function mapServices(
  records: readonly AgentServiceRecord[],
): readonly AgentProfileService[] {
  return records.map((record) => ({
    endpoint: record.endpoint,
    metadata: record.metadata,
    serviceType: record.service_type,
    version: record.version,
  }));
}

function createSupabaseSources(
  client: SupabaseClient<Database>,
): AgentProfileSources {
  return {
    async findAgent(chainId, agentId) {
      const { data, error } = await client
        .from("agents")
        .select("*")
        .eq("chain_id", chainId)
        .eq("agent_id", agentId)
        .order("updated_at", { ascending: false })
        .limit(2);

      if (error) {
        throw new DatabaseOperationError("find agent profile", error);
      }

      if (data.length > 1) {
        throw new DatabaseOperationError(
          "find agent profile",
          new Error("Multiple registry records map to the requested profile route."),
        );
      }

      return data[0] ?? null;
    },
    async findHealth(agentDbId) {
      const { data, error } = await client
        .from("agent_health")
        .select("*")
        .eq("agent_db_id", agentDbId)
        .maybeSingle();

      if (error) {
        throw new DatabaseOperationError("find agent health evidence", error);
      }

      return data;
    },
    async findReputation(agentDbId) {
      const { data, error } = await client
        .from("agent_reputation")
        .select("*")
        .eq("agent_db_id", agentDbId)
        .maybeSingle();

      if (error) {
        throw new DatabaseOperationError(
          "find agent reputation evidence",
          error,
        );
      }

      return data;
    },
    async findScore(agentDbId) {
      const { data, error } = await client
        .from("agent_scores")
        .select("*")
        .eq("agent_db_id", agentDbId)
        .maybeSingle();

      if (error) {
        throw new DatabaseOperationError("find agent Sift Score", error);
      }

      return data;
    },
    async listServices(agentDbId) {
      const { data, error } = await client
        .from("agent_services")
        .select("*")
        .eq("agent_db_id", agentDbId)
        .order("created_at", { ascending: true });

      if (error) {
        throw new DatabaseOperationError("list agent profile services", error);
      }

      return data;
    },
  };
}

export function createAgentProfileRepository(
  sources: AgentProfileSources = createSupabaseSources(
    getSupabaseServerClient(),
  ),
): AgentProfileRepository {
  return {
    async findByIdentity(chainId, agentId) {
      const agent = await sources.findAgent(chainId, agentId);

      if (!agent) {
        return null;
      }

      const [serviceRecords, healthRecord, reputationRecord, scoreRecord] =
        await Promise.all([
          sources.listServices(agent.id),
          sources.findHealth(agent.id),
          sources.findReputation(agent.id),
          sources.findScore(agent.id),
        ]);
      const services = mapServices(serviceRecords);
      const category = mapCategory(agent.category);
      const { categories, categorySource } = resolveProfileCategories(
        category,
        agent.name,
        agent.description,
        services,
      );

      return {
        active: agent.active,
        agentId: agent.agent_id,
        agentUri: agent.agent_uri,
        categories,
        categorySource,
        chainId: agent.chain_id,
        description: agent.description,
        health: healthRecord ? mapHealthRecord(healthRecord) : null,
        imageUrl: agent.image_url,
        lastSyncedAt: agent.last_synced_at,
        metadataStatus: mapMetadataStatus(agent.metadata_status),
        metadataVerifiedAt:
          agent.metadata_verified_at ??
          (agent.metadata_status === "valid" ? agent.last_synced_at : null),
        name: agent.name,
        ownerAddress: agent.owner_address,
        registeredAt: agent.registered_at,
        registeredBlock: agent.registered_block,
        registryAddress: agent.registry_address,
        reputation: mapReputation(reputationRecord),
        score: scoreRecord ? mapScoreRecord(scoreRecord) : null,
        services,
        x402Supported: agent.x402_supported,
      };
    },
  };
}
