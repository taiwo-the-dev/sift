import { connection } from "next/server";

import { AgentCollectionsSection } from "@/components/landing/agent-collections-section";
import { CategorySection } from "@/components/landing/category-section";
import { CredibilityBand } from "@/components/landing/credibility-band";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TrustSection } from "@/components/landing/trust-section";
import type { DiscoveryAgent } from "@/features/discovery/model";
import type { FeaturedScoredAgent } from "@/features/scoring/model";
import { createDiscoveryRepository } from "@/lib/db/discovery-repository";
import { createFeaturedAgentRepository } from "@/lib/db/featured-agent-repository";

export default async function HomePage() {
  await connection();

  let catalogueAvailable = true;
  let catalogueCount: number | null = null;
  let featuredAgents: FeaturedScoredAgent[] = [];
  let recentAgents: DiscoveryAgent[] = [];

  try {
    const result = await createDiscoveryRepository().listRecentlyRegistered();
    catalogueCount = result.totalCount;
    recentAgents = [...result.agents.slice(0, 3)];
  } catch {
    catalogueAvailable = false;
  }

  try {
    featuredAgents = [
      ...(await createFeaturedAgentRepository().listFeatured(3, new Date())),
    ];
  } catch {
    // Featured placement is optional and must disappear rather than fall back
    // to unqualified or simulated agents when score evidence is unavailable.
  }

  return (
    <>
      <HeroSection />
      <CredibilityBand catalogueCount={catalogueCount} />
      <HowItWorksSection />
      <CategorySection />
      <AgentCollectionsSection
        catalogueAvailable={catalogueAvailable}
        featuredAgents={featuredAgents}
        recentAgents={recentAgents}
      />
      <TrustSection />
      <FinalCtaSection />
    </>
  );
}
