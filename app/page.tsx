import { connection } from "next/server";

import { AgentCollectionsSection } from "@/components/landing/agent-collections-section";
import { CategorySection } from "@/components/landing/category-section";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TrustSection } from "@/components/landing/trust-section";
import type { DiscoveryAgent } from "@/features/discovery/model";
import { createDiscoveryRepository } from "@/lib/db/discovery-repository";

export default async function HomePage() {
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
    <>
      <HeroSection />
      <CategorySection />
      <AgentCollectionsSection
        catalogueAvailable={catalogueAvailable}
        catalogueCount={catalogueCount}
        recentAgents={recentAgents}
      />
      <HowItWorksSection />
      <TrustSection />
      <FinalCtaSection />
    </>
  );
}
