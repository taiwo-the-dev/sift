import { Suspense } from "react";

import {
  AgentCollectionsLoading,
} from "@/components/landing/agent-collections-section";
import { AgentCollectionsData } from "@/components/landing/agent-collections-data";
import { CategorySection } from "@/components/landing/category-section";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TrustSection } from "@/components/landing/trust-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <CategorySection />
      <Suspense fallback={<AgentCollectionsLoading />}>
        <AgentCollectionsData />
      </Suspense>
      <HowItWorksSection />
      <TrustSection />
      <FinalCtaSection />
    </>
  );
}
