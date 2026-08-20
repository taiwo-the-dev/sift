import { AgentCollectionsSection } from "@/components/landing/agent-collections-section";
import { CategorySection } from "@/components/landing/category-section";
import { CredibilityBand } from "@/components/landing/credibility-band";
import { FinalCtaSection } from "@/components/landing/final-cta-section";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { TrustSection } from "@/components/landing/trust-section";

interface HomePageProps {
  searchParams: Promise<{
    goal?: string | string[];
  }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const rawGoal = params.goal;
  const goal = typeof rawGoal === "string" ? rawGoal.trim().slice(0, 180) : "";

  return (
    <>
      <HeroSection submittedGoal={goal} />
      <CredibilityBand />
      <HowItWorksSection />
      <CategorySection />
      <AgentCollectionsSection />
      <TrustSection />
      <FinalCtaSection />
    </>
  );
}
