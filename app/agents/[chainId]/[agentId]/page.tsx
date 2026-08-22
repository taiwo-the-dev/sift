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
import { formatAgentName, formatChainName } from "@/features/discovery/format";

interface AgentProfilePageProps {
  params: Promise<Readonly<{ agentId: string; chainId: string }>>;
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
}: AgentProfilePageProps) {
  const { agentId, chainId } = await params;
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
      <ProfileHeader profile={profile} />
      <ProfileNavigation />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <ProfileOverview profile={profile} />
        <ProfileCapabilities profile={profile} />
        <ProfileEvidence profile={profile} />
        <ProfileActivity profile={profile} />
        <ProfileTechnical profile={profile} />
      </div>
    </div>
  );
}
