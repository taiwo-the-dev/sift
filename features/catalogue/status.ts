import type { SupportedBnbNetwork } from "@/lib/blockchain/chains";

export const catalogueStaleAfterMs = 6 * 60 * 60 * 1_000;

export type CatalogueSyncPhase = "current" | "partial" | "unavailable";

export type CatalogueNetworkStatus = Readonly<{
  agentCount: number;
  agentCountIsEstimate: boolean;
  chainId: number;
  checkpoint: number | null;
  checkpointUpdatedAt: string | null;
  confirmedHead: number | null;
  isStale: boolean;
  label: string;
  latestAgentSyncAt: string | null;
  network: SupportedBnbNetwork;
  phase: CatalogueSyncPhase;
  registryAddress: string;
}>;

export function deriveCatalogueSyncState(
  checkpoint: Readonly<{
    confirmedHead: number | null;
    lastSyncedBlock: number;
    updatedAt: string;
  }> | null,
  now: Date,
): Readonly<{ isStale: boolean; phase: CatalogueSyncPhase }> {
  if (!checkpoint) {
    return { isStale: false, phase: "unavailable" };
  }

  const observedAt = Date.parse(checkpoint.updatedAt);
  const isStale =
    Number.isNaN(observedAt) || now.getTime() - observedAt > catalogueStaleAfterMs;
  const phase =
    checkpoint.confirmedHead !== null &&
    checkpoint.lastSyncedBlock < checkpoint.confirmedHead
      ? "partial"
      : "current";

  return { isStale, phase };
}
