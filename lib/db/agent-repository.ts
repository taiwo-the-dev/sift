import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/db/client";
import type { Database, TableRow } from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";
import {
  validateAgentIdentity,
  validateAgentWrite,
  type AgentIdentityInput,
  type AgentWriteInput,
} from "@/lib/db/validation";

export type AgentRecord = TableRow<"agents">;

export type AgentRepository = Readonly<{
  findByIdentity(identity: AgentIdentityInput): Promise<AgentRecord | null>;
  upsert(input: AgentWriteInput): Promise<AgentRecord>;
}>;

export function createAgentRepository(
  client: SupabaseClient<Database> = getSupabaseServerClient(),
): AgentRepository {
  return {
    async findByIdentity(identity) {
      const record = validateAgentIdentity(identity);
      const { data, error } = await client
        .from("agents")
        .select("*")
        .eq("chain_id", record.chain_id)
        .eq("registry_address", record.registry_address)
        .eq("agent_id", record.agent_id)
        .maybeSingle();

      if (error) {
        throw new DatabaseOperationError("find agent by identity", error);
      }

      return data;
    },

    async upsert(input) {
      const record = validateAgentWrite(input);
      const { data, error } = await client
        .from("agents")
        .upsert(record, {
          onConflict: "chain_id,registry_address,agent_id",
        })
        .select("*")
        .single();

      if (error) {
        throw new DatabaseOperationError("upsert agent", error);
      }

      return data;
    },
  };
}
