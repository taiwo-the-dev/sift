import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { AgentProfileContent } from "@/components/agents/agent-profile-content";
import { AgentProfileLoading } from "@/components/agents/agent-profile-loading";
import { parseAgentProfileIdentity } from "@/features/agents/route";
import { getAgentProfile } from "@/features/agents/service";
import { parseAgentProfileTab } from "@/features/agents/tabs";
import { formatAgentName, formatChainName } from "@/features/discovery/format";
import {
  normalizeComparisonGoal,
  type ComparisonSearchParams,
} from "@/features/comparison/query";
import { createPageMetadata } from "@/lib/metadata";

interface AgentProfilePageProps {
  params: Promise<Readonly<{ agentId: string; chainId: string }>>;
  searchParams: Promise<ComparisonSearchParams>;
}

function metadataDescription(
  description: string | null,
  chainId: number,
  agentId: string,
): string {
  const fallback = `View ERC-8004 agent #${agentId} on ${formatChainName(chainId)}.`;
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
    return createPageMetadata({
      description: "The requested ERC-8004 agent profile could not be found.",
      noIndex: true,
      path: "/agents/profile-not-found",
      title: "Agent not found",
    });
  }

  const profile = await getAgentProfile(identity.chainId, identity.agentId);

  if (!profile) {
    return createPageMetadata({
      description: "The requested ERC-8004 agent profile could not be found.",
      noIndex: true,
      path: "/agents/profile-not-found",
      title: "Agent not found",
    });
  }

  return createPageMetadata({
    title: formatAgentName(profile.name, profile.agentId),
    description: metadataDescription(
      profile.description,
      profile.chainId,
      profile.agentId,
    ),
    path: `/agents/${profile.chainId}/${profile.agentId}`,
  });
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

  if (!identity) notFound();

  return (
    <div className="flex-1 bg-background">
      <Suspense fallback={<AgentProfileLoading agentId={identity.agentId} />}>
        <AgentProfileContent
          activeTab={activeTab}
          comparisonGoal={comparisonGoal}
          identity={identity}
        />
      </Suspense>
    </div>
  );
}
