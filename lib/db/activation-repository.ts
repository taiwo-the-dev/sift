import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ACTIVATION_VALIDATION_VERSION,
  parseActivationMethod,
  parseActivationStatus,
  type ActivationCandidate,
  type ActivationObservation,
} from "@/features/activation/model";
import { getSupabaseServerClient } from "@/lib/db/client";
import type { Database, TableRow } from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";

export type ActivationRepository = Readonly<{
  findService(serviceId: string): Promise<TableRow<"agent_services"> | null>;
  isServiceAgentEligible(agentDbId: string): Promise<boolean>;
  listCandidates(
    limit: number,
    staleBefore: string,
  ): Promise<readonly ActivationCandidate[]>;
  save(
    observations: readonly ActivationObservation[],
    checkedAt: string,
  ): Promise<void>;
}>;

export function createActivationRepository(
  client: SupabaseClient<Database> = getSupabaseServerClient(),
): ActivationRepository {
  async function findService(
    serviceId: string,
  ): Promise<TableRow<"agent_services"> | null> {
    const { data, error } = await client
      .from("agent_services")
      .select("*")
      .eq("id", serviceId)
      .maybeSingle();
    if (error) {
      throw new DatabaseOperationError("find activation service", error);
    }
    return data;
  }

  return {
    findService,
    async isServiceAgentEligible(agentDbId) {
      const { data, error } = await client
        .from("agents")
        .select("active,metadata_status")
        .eq("id", agentDbId)
        .maybeSingle();
      if (error) {
        throw new DatabaseOperationError("check activation agent", error);
      }
      return data?.metadata_status === "valid" && data.active !== false;
    },
    async listCandidates(limit, staleBefore) {
      const { data, error } = await client.rpc("activation_check_candidates", {
        p_limit: limit,
        p_stale_before: staleBefore,
      });
      if (error) {
        throw new DatabaseOperationError("list activation candidates", error);
      }
      return data.map((row) => ({
        agentDbId: row.agent_db_id,
        agentId: row.agent_id,
        chainId: row.chain_id,
        endpoint: row.endpoint,
        failureCount: row.availability_failure_count,
        lastSuccessAt: row.availability_last_success_at,
        method: parseActivationMethod(row.activation_method),
        ownerAddress: row.owner_address,
        serviceId: row.service_id,
        serviceType: row.service_type,
        status: parseActivationStatus(row.availability_status),
        version: row.version,
      }));
    },
    async save(observations, checkedAt) {
      for (const observation of observations) {
        const current = await findService(observation.serviceId);
        if (!current) continue;
        const successful = observation.status === "available";
        const { error } = await client
          .from("agent_services")
          .update({
            activation_method: observation.method,
            activation_validation_version: ACTIVATION_VALIDATION_VERSION,
            availability_checked_at: checkedAt,
            availability_failure_code: observation.failureCode,
            availability_failure_count: successful
              ? 0
              : current.availability_failure_count + 1,
            availability_last_success_at: successful
              ? checkedAt
              : current.availability_last_success_at,
            availability_response_time_ms: observation.responseTimeMs,
            availability_status: observation.status,
            capability_summary: observation.capabilitySummary,
          })
          .eq("id", observation.serviceId);
        if (error) {
          throw new DatabaseOperationError("save activation evidence", error);
        }
      }
    },
  };
}
