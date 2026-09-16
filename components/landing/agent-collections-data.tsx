import { connection } from "next/server";

import { AgentCollectionsSection } from "@/components/landing/agent-collections-section";
import type { DiscoveryAgent } from "@/features/discovery/model";
import { parseDiscoverySearchParams } from "@/features/discovery/query";
import { createDiscoveryRepository } from "@/lib/db/discovery-repository";
import { getSelectedCatalogueNetwork } from "@/lib/network/selection";

export async function AgentCollectionsData() {
  await connection();
  const network = await getSelectedCatalogueNetwork();

  let catalogueAvailable = true;
  let featuredAgents: DiscoveryAgent[] = [];

  const repository = createDiscoveryRepository();
  try {
    // Prefer agents with a usable task service. This is a landing-page
    // showcase, so if too few qualify (for example most declared services
    // have not been health-checked recently) top up with verified profiles
    // rather than rendering a near-empty carousel.
    const readyResult = await repository.search(
      parseDiscoverySearchParams({
        availability: "ready",
        network,
        size: "24",
      }),
    );
    featuredAgents = readyResult.agents.slice(0, 10);

    if (featuredAgents.length < 10) {
      const verifiedResult = await repository.search(
        parseDiscoverySearchParams({
          metadata: "valid",
          network,
          size: "24",
        }),
      );
      const seenAgentIds = new Set(
        featuredAgents.map((agent) => agent.agentDbId),
      );

      for (const agent of verifiedResult.agents) {
        if (featuredAgents.length >= 10) break;
        if (seenAgentIds.has(agent.agentDbId)) continue;
        featuredAgents = [...featuredAgents, agent];
        seenAgentIds.add(agent.agentDbId);
      }
    }
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
