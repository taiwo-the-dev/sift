import { connection } from "next/server";

import { AgentCollectionsSection } from "@/components/landing/agent-collections-section";
import type { DiscoveryAgent } from "@/features/discovery/model";
import { parseDiscoverySearchParams } from "@/features/discovery/query";
import { createDiscoveryRepository } from "@/lib/db/discovery-repository";

export async function AgentCollectionsData() {
  await connection();

  let catalogueAvailable = true;
  let featuredAgents: DiscoveryAgent[] = [];

  const repository = createDiscoveryRepository();
  try {
    const result = await repository.search(
      parseDiscoverySearchParams({
        availability: "ready",
        network: "all",
        size: "24",
      }),
    );
    featuredAgents = result.agents.slice(0, 10);
  } catch {
    catalogueAvailable = false;
  }

  return (
    <AgentCollectionsSection
      catalogueAvailable={catalogueAvailable}
      featuredAgents={featuredAgents}
    />
  );
}
