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
    // Prefer agents with a usable task service. This is a landing-page
    // showcase, so if nothing qualifies (for example every declared service
    // has been probed unavailable) fall back to verified profiles rather than
    // rendering an empty carousel.
    const readyResult = await repository.search(
      parseDiscoverySearchParams({
        availability: "ready",
        network: "all",
        size: "24",
      }),
    );
    featuredAgents = readyResult.agents.slice(0, 10);

    if (featuredAgents.length === 0) {
      const verifiedResult = await repository.search(
        parseDiscoverySearchParams({
          metadata: "valid",
          network: "all",
          size: "24",
        }),
      );
      featuredAgents = verifiedResult.agents.slice(0, 10);
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
