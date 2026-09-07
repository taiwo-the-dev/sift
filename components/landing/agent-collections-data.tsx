import { connection } from "next/server";

import { AgentCollectionsSection } from "@/components/landing/agent-collections-section";
import type { DiscoveryAgent } from "@/features/discovery/model";
import { createDiscoveryRepository } from "@/lib/db/discovery-repository";

export async function AgentCollectionsData() {
  await connection();

  let catalogueAvailable = true;
  let catalogueCount: number | null = null;
  let recentAgents: DiscoveryAgent[] = [];

  try {
    const catalogueResult =
      await createDiscoveryRepository().listRecentlyRegistered();
    catalogueCount = catalogueResult.totalCount;
    recentAgents = [...catalogueResult.agents.slice(0, 10)];
  } catch {
    catalogueAvailable = false;
  }

  return (
    <AgentCollectionsSection
      catalogueAvailable={catalogueAvailable}
      catalogueCount={catalogueCount}
      recentAgents={recentAgents}
    />
  );
}
