import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProfileActivity } from "@/components/agents/profile-activity";
import { ProfileCapabilities } from "@/components/agents/profile-capabilities";
import { ProfileEvidence } from "@/components/agents/profile-evidence";
import { ProfileHeader } from "@/components/agents/profile-header";
import { ProfileNavigation } from "@/components/agents/profile-navigation";
import { ProfileOverview } from "@/components/agents/profile-overview";
import { ProfileTechnical } from "@/components/agents/profile-technical";
import { parseAgentProfileIdentity } from "@/features/agents/route";
import { getAgentProfile } from "@/features/agents/service";
import { parseAgentProfileTab } from "@/features/agents/tabs";
import { formatAgentName, formatChainName } from "@/features/discovery/format";
import {
  normalizeComparisonGoal,
  type ComparisonSearchParams,
} from "@/features/comparison/query";

interface AgentProfilePageProps {
  params: Promise<Readonly<{ agentId: string; chainId: string }>>;
  searchParams: Promise<ComparisonSearchParams>;
}

function metadataDescription(
  description: string | null,
  chainId: number,
  agentId: string,
): string {
  const fallback = `View the indexed ERC-8004 profile for agent #${agentId} on ${formatChainName(chainId)}.`;
  const normalized = description?.replace(/\s+/g, " ").trim() || fallback;

  return normalized.length > 160
    ? `${normalized.slice(0, 157).trimEnd()}…`
    : normalized;
}

export async function generateMetadata({
  params,
}: AgentProfilePageProps): Promise<Metadata> {
  const { agentId, chainId } = await params;
  const identity = parseAgentProfileIdentity(chainId, agentId);

  if (!identity) {
    return {
      title: "Agent not found",
      robots: { index: false, follow: false },
    };
  }

  const profile = await getAgentProfile(identity.chainId, identity.agentId);

  if (!profile) {
    return {
      title: "Agent not found",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: formatAgentName(profile.name, profile.agentId),
    description: metadataDescription(
      profile.description,
      profile.chainId,
      profile.agentId,
    ),
  };
}

export default async function AgentProfilePage({
  params,
  searchParams,
}: AgentProfilePageProps) {
  const { agentId, chainId } = await params;
  const query = await searchParams;
  const rawGoal = query.goal;
  const comparisonGoal = normalizeComparisonGoal(
    Array.isArray(rawGoal) ? rawGoal[0] : rawGoal,
  );
  const activeTab = parseAgentProfileTab(query.tab);
  const identity = parseAgentProfileIdentity(chainId, agentId);

  if (!identity) {
    notFound();
  }

  const profile = await getAgentProfile(identity.chainId, identity.agentId);

  if (!profile) {
    notFound();
  }

  return (
    <div className="flex-1 bg-background">
      <ProfileHeader comparisonGoal={comparisonGoal} profile={profile} />
      <ProfileNavigation
        activeTab={activeTab}
        comparisonGoal={comparisonGoal}
        profile={profile}
      />
      <div className="mx-auto min-h-[34rem] w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {activeTab === "overview" ? <ProfileOverview profile={profile} /> : null}
        {activeTab === "services" ? (
          <ProfileCapabilities profile={profile} />
        ) : null}
        {activeTab === "trust" ? <ProfileEvidence profile={profile} /> : null}
        {activeTab === "activity" ? <ProfileActivity profile={profile} /> : null}
        {activeTab === "metadata" ? <ProfileTechnical profile={profile} /> : null}
      </div>
    </div>
  );
}
