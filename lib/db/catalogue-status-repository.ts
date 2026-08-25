import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CatalogueNetworkStatus } from "@/features/catalogue/status";
import { deriveCatalogueSyncState } from "@/features/catalogue/status";
import { bnbNetworkDefinitions } from "@/lib/indexer/config";
import { getSupabaseServerClient } from "@/lib/db/client";
import type { Database, TableRow } from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";

type NetworkObservation = Readonly<{
  agentCount: number;
  checkpoint: TableRow<"sync_state"> | null;
  latestAgentSyncAt: string | null;
}>;

export type CatalogueStatusSources = Readonly<{
  observe(chainId: number, registryAddress: string): Promise<NetworkObservation>;
}>;

export type CatalogueStatusRepository = Readonly<{
  list(now?: Date): Promise<readonly CatalogueNetworkStatus[]>;
}>;

const catalogueDefinitions = [
  { label: "BSC Mainnet", network: "bsc-mainnet" },
  { label: "BSC Testnet", network: "bsc-testnet" },
] as const;

function createSupabaseSources(
  client: SupabaseClient<Database>,
): CatalogueStatusSources {
  return {
    async observe(chainId, registryAddress) {
      const normalizedRegistry = registryAddress.toLowerCase();
      const [countResult, latestResult, checkpointResult] = await Promise.all([
        client
          .from("agents")
          .select("id", { count: "exact", head: true })
          .eq("chain_id", chainId)
          .eq("registry_address", normalizedRegistry),
        client
          .from("agents")
          .select("last_synced_at")
          .eq("chain_id", chainId)
          .eq("registry_address", normalizedRegistry)
          .not("last_synced_at", "is", null)
          .order("last_synced_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        client
          .from("sync_state")
          .select("*")
          .eq("chain_id", chainId)
          .eq("registry_address", normalizedRegistry)
          .maybeSingle(),
      ]);

      const error =
        countResult.error ?? latestResult.error ?? checkpointResult.error;

      if (error || countResult.count === null) {
        throw new DatabaseOperationError("read catalogue network status", error);
      }

      return {
        agentCount: countResult.count,
        checkpoint: checkpointResult.data,
        latestAgentSyncAt: latestResult.data?.last_synced_at ?? null,
      };
    },
  };
}

export function createCatalogueStatusRepository(
  sources: CatalogueStatusSources = createSupabaseSources(
    getSupabaseServerClient(),
  ),
): CatalogueStatusRepository {
  return {
    async list(now = new Date()) {
      return Promise.all(
        catalogueDefinitions.map(async ({ label, network }) => {
          const definition = bnbNetworkDefinitions[network];
          const observation = await sources.observe(
            definition.chainId,
            definition.registryAddress,
          );
          const syncState = deriveCatalogueSyncState(
            observation.checkpoint
              ? {
                  confirmedHead: observation.checkpoint.confirmed_head,
                  lastSyncedBlock: observation.checkpoint.last_synced_block,
                  updatedAt: observation.checkpoint.updated_at,
                }
              : null,
            now,
          );

          return {
            agentCount: observation.agentCount,
            chainId: definition.chainId,
            checkpoint: observation.checkpoint?.last_synced_block ?? null,
            checkpointUpdatedAt: observation.checkpoint?.updated_at ?? null,
            confirmedHead: observation.checkpoint?.confirmed_head ?? null,
            isStale: syncState.isStale,
            label,
            latestAgentSyncAt: observation.latestAgentSyncAt,
            network,
            phase: syncState.phase,
            registryAddress: definition.registryAddress.toLowerCase(),
          } satisfies CatalogueNetworkStatus;
        }),
      );
    },
  };
}
