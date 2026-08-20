import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "@/lib/db/client";
import type { Database, TableRow } from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";
import {
  validateSyncCheckpoint,
  type SyncCheckpointInput,
} from "@/lib/db/validation";

export type SyncCheckpointRecord = TableRow<"sync_state">;

export type SyncStateRepository = Readonly<{
  find(
    identity: Omit<SyncCheckpointInput, "lastSyncedBlock">,
  ): Promise<SyncCheckpointRecord | null>;
  upsert(input: SyncCheckpointInput): Promise<SyncCheckpointRecord>;
}>;

export function createSyncStateRepository(
  client: SupabaseClient<Database> = getSupabaseServerClient(),
): SyncStateRepository {
  return {
    async find(identity) {
      const checkpoint = validateSyncCheckpoint({
        ...identity,
        lastSyncedBlock: 0,
      });
      const { data, error } = await client
        .from("sync_state")
        .select("*")
        .eq("chain_id", checkpoint.chain_id)
        .eq("registry_address", checkpoint.registry_address)
        .maybeSingle();

      if (error) {
        throw new DatabaseOperationError("find sync checkpoint", error);
      }

      return data;
    },

    async upsert(input) {
      const checkpoint = validateSyncCheckpoint(input);
      const { data, error } = await client
        .from("sync_state")
        .upsert(checkpoint, {
          onConflict: "chain_id,registry_address",
        })
        .select("*")
        .single();

      if (error) {
        throw new DatabaseOperationError("upsert sync checkpoint", error);
      }

      return data;
    },
  };
}
