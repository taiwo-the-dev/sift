import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  healthOutcomes,
  healthStatuses,
  type HealthCandidate,
  type HealthSnapshot,
} from "@/features/health/model";
import { getSupabaseServerClient } from "@/lib/db/client";
import type {
  Database,
  TableInsert,
  TableRow,
} from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";
import {
  validateAgentHealthWrite,
  type AgentHealthWriteInput,
} from "@/lib/db/validation";

type AgentRecord = Pick<
  TableRow<"agents">,
  "agent_id" | "chain_id" | "id"
>;
type HealthRecord = TableRow<"agent_health">;
type ServiceRecord = Pick<
  TableRow<"agent_services">,
  "agent_db_id" | "endpoint" | "service_type"
>;

export type HealthRepositorySources = Readonly<{
  listAgentRecords(ids: readonly string[]): Promise<readonly AgentRecord[]>;
  listCandidateIds(
    limit: number,
    staleBefore: string,
  ): Promise<readonly string[]>;
  listHealthRecords(ids: readonly string[]): Promise<readonly HealthRecord[]>;
  listServiceRecords(ids: readonly string[]): Promise<readonly ServiceRecord[]>;
  upsertHealth(
    records: readonly TableInsert<"agent_health">[],
  ): Promise<void>;
}>;

export type HealthRepository = Readonly<{
  listCandidates(
    limit: number,
    staleBefore: string,
  ): Promise<readonly HealthCandidate[]>;
  save(snapshots: readonly AgentHealthWriteInput[]): Promise<void>;
}>;

export function mapHealthRecord(record: HealthRecord): HealthSnapshot {
  const status = healthStatuses.find(
    (candidate) => candidate === record.status,
  );
  const outcome = healthOutcomes.find(
    (candidate) => candidate === record.outcome,
  );

  if (!status) {
    throw new DatabaseOperationError(
      "map agent health",
      new TypeError("The database returned an unsupported health status."),
    );
  }

  if (record.outcome !== null && !outcome) {
    throw new DatabaseOperationError(
      "map agent health",
      new TypeError("The database returned an unsupported health outcome."),
    );
  }

  return {
    checkCount: record.check_count,
    checkedEndpoint: record.checked_endpoint,
    endpointHash: record.endpoint_hash,
    failureCount: record.failure_count,
    lastCheckedAt: record.last_checked_at,
    lastSuccessAt: record.last_success_at,
    outcome: outcome ?? null,
    responseTimeMs: record.response_time_ms,
    serviceType: record.service_type,
    status,
    successCount: record.success_count,
  };
}

function createSupabaseSources(
  client: SupabaseClient<Database>,
): HealthRepositorySources {
  return {
    async listCandidateIds(limit, staleBefore) {
      const { data, error } = await client.rpc("health_check_candidates", {
        p_limit: limit,
        p_stale_before: staleBefore,
      });

      if (error) {
        throw new DatabaseOperationError("list health candidates", error);
      }

      return data.map((row) => row.agent_db_id);
    },
    async listAgentRecords(ids) {
      const { data, error } = await client
        .from("agents")
        .select("id,agent_id,chain_id")
        .in("id", [...ids]);

      if (error) {
        throw new DatabaseOperationError("list health candidate agents", error);
      }

      return data;
    },
    async listHealthRecords(ids) {
      const { data, error } = await client
        .from("agent_health")
        .select("*")
        .in("agent_db_id", [...ids]);

      if (error) {
        throw new DatabaseOperationError("list previous health", error);
      }

      return data;
    },
    async listServiceRecords(ids) {
      const { data, error } = await client
        .from("agent_services")
        .select("agent_db_id,endpoint,service_type")
        .in("agent_db_id", [...ids]);

      if (error) {
        throw new DatabaseOperationError(
          "list health candidate services",
          error,
        );
      }

      return data;
    },
    async upsertHealth(records) {
      const { error } = await client
        .from("agent_health")
        .upsert([...records], { onConflict: "agent_db_id" });

      if (error) {
        throw new DatabaseOperationError("persist agent health", error);
      }
    },
  };
}

export function createHealthRepository(
  sources: HealthRepositorySources = createSupabaseSources(
    getSupabaseServerClient(),
  ),
): HealthRepository {
  return {
    async listCandidates(limit, staleBefore) {
      const ids = await sources.listCandidateIds(limit, staleBefore);

      if (ids.length === 0) {
        return [];
      }

      const [agents, healthRecords, serviceRecords] = await Promise.all([
        sources.listAgentRecords(ids),
        sources.listHealthRecords(ids),
        sources.listServiceRecords(ids),
      ]);
      const agentById = new Map(agents.map((agent) => [agent.id, agent]));
      const healthById = new Map(
        healthRecords.map((health) => [
          health.agent_db_id,
          mapHealthRecord(health),
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
            "compose health candidates",
            new Error("A queued health candidate no longer exists."),
          );
        }

        return {
          agentDbId: id,
          agentId: agent.agent_id,
          chainId: agent.chain_id,
          previousHealth: healthById.get(id) ?? null,
          services: (servicesById.get(id) ?? []).map((service) => ({
              endpoint: service.endpoint,
              serviceType: service.service_type,
            })),
        };
      });
    },
    async save(snapshots) {
      if (snapshots.length === 0) {
        return;
      }

      await sources.upsertHealth(snapshots.map(validateAgentHealthWrite));
    },
  };
}
