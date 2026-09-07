import { notFound } from "next/navigation";

import { ProfileActivity } from "@/components/agents/profile-activity";
import { ProfileCapabilities } from "@/components/agents/profile-capabilities";
import { ProfileEvidence } from "@/components/agents/profile-evidence";
import { ProfileHeader } from "@/components/agents/profile-header";
import { ProfileNavigation } from "@/components/agents/profile-navigation";
import { ProfileOverview } from "@/components/agents/profile-overview";
import { ProfileTechnical } from "@/components/agents/profile-technical";
import type { AgentProfileIdentity } from "@/features/agents/route";
import { getAgentProfile } from "@/features/agents/service";
import type { AgentProfileTab } from "@/features/agents/tabs";

interface AgentProfileContentProps {
  activeTab: AgentProfileTab;
  comparisonGoal: string;
  identity: AgentProfileIdentity;
}

export async function AgentProfileContent({
  activeTab,
  comparisonGoal,
  identity,
}: AgentProfileContentProps) {
  const profile = await getAgentProfile(identity.chainId, identity.agentId);

  if (!profile) notFound();

  return (
    <div className="sift-data-arrival">
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
