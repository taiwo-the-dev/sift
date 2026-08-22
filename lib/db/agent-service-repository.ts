import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/db/client";
import type { Database, TableRow } from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";
import {
  validateAgentDatabaseId,
  validateAgentServiceWrite,
  type AgentServiceWriteInput,
} from "@/lib/db/validation";

export type AgentServiceRecord = TableRow<"agent_services">;

export type AgentServiceRepository = Readonly<{
  listByAgent(agentDbId: string): Promise<readonly AgentServiceRecord[]>;
  replaceForAgent(
    agentDbId: string,
    services: readonly Omit<AgentServiceWriteInput, "agentDbId">[],
  ): Promise<void>;
}>;

function serviceIdentity(
  service: Readonly<{
    endpoint?: string | null;
    service_type: string;
    version?: string | null;
  }>,
): string {
  return JSON.stringify([
    service.service_type,
    service.endpoint ?? "",
    service.version ?? "",
  ]);
}

export function createAgentServiceRepository(
  client: SupabaseClient<Database> = getSupabaseServerClient(),
): AgentServiceRepository {
  async function listByAgent(
    agentDbId: string,
  ): Promise<readonly AgentServiceRecord[]> {
    const validatedId = validateAgentDatabaseId(agentDbId);
    const { data, error } = await client
      .from("agent_services")
      .select("*")
      .eq("agent_db_id", validatedId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new DatabaseOperationError("list agent services", error);
    }

    return data;
  }

  return {
    listByAgent,
    async replaceForAgent(agentDbId, services) {
      const records = services.map((service) =>
        validateAgentServiceWrite({ agentDbId, ...service }),
      );
      const identities = new Set(records.map(serviceIdentity));

      if (identities.size !== records.length) {
        throw new TypeError("Agent service metadata contains duplicate services.");
      }

      const existing = await listByAgent(agentDbId);
      const existingByIdentity = new Map(
        existing.map((service) => [serviceIdentity(service), service]),
      );

      // Upsert the complete new set before removing stale rows. A failed write
      // therefore cannot erase the last-known-good service catalogue.
      for (const record of records) {
        const current = existingByIdentity.get(serviceIdentity(record));
        const query = current
          ? client
              .from("agent_services")
              .update({ metadata: record.metadata })
              .eq("id", current.id)
          : client.from("agent_services").insert(record);
        const { error } = await query;

        if (error) {
          throw new DatabaseOperationError("write agent service", error);
        }
      }

      for (const stale of existing.filter(
        (service) => !identities.has(serviceIdentity(service)),
      )) {
        const { error } = await client
          .from("agent_services")
          .delete()
          .eq("id", stale.id);

        if (error) {
          throw new DatabaseOperationError("remove stale agent service", error);
        }
      }
    },
  };
}
