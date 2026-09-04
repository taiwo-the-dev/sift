import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/db/client";
import type { Database, TableInsert, TableRow } from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";

export type ExternalEvidenceRecord = TableRow<"agent_external_evidence">;

export type ExternalEvidenceRepository = Readonly<{
  find(agentDbId: string, provider: "8004scan"): Promise<ExternalEvidenceRecord | null>;
  upsert(record: TableInsert<"agent_external_evidence">): Promise<void>;
}>;

export function createExternalEvidenceRepository(
  client: SupabaseClient<Database> = getSupabaseServerClient(),
): ExternalEvidenceRepository {
  return {
    async find(agentDbId, provider) {
      const { data, error } = await client
        .from("agent_external_evidence")
        .select("*")
        .eq("agent_db_id", agentDbId)
        .eq("provider", provider)
        .maybeSingle();

      if (error) {
        throw new DatabaseOperationError("read external evidence cache", error);
      }

      return data;
    },
    async upsert(record) {
      const { error } = await client
        .from("agent_external_evidence")
        .upsert(record, { onConflict: "agent_db_id,provider" });

      if (error) {
        throw new DatabaseOperationError("persist external evidence cache", error);
      }
    },
  };
}
