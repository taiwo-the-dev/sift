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
  const observedAt = new Date();
  const [recentResult, featuredResult] = await Promise.allSettled([
    createDiscoveryRepository().listRecentlyRegistered(),
    createFeaturedAgentRepository().listFeatured(3, observedAt),
  ]);

  if (recentResult.status === "fulfilled") {
    catalogueCount = recentResult.value.totalCount;
    recentAgents = [...recentResult.value.agents.slice(0, 3)];
  } else {
    catalogueAvailable = false;
  }

  if (featuredResult.status === "fulfilled") {
    featuredAgents = [...featuredResult.value];
  } else {
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
