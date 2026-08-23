import Link from "next/link";

import type { AgentProfile } from "@/features/agents/model";
import {
  agentProfileTabs,
  buildAgentProfileTabHref,
  type AgentProfileTab,
} from "@/features/agents/tabs";
import { cn } from "@/lib/utils";

interface ProfileNavigationProps {
  activeTab: AgentProfileTab;
  comparisonGoal?: string;
  profile: AgentProfile;
}

export function ProfileNavigation({
  activeTab,
  comparisonGoal = "",
  profile,
}: ProfileNavigationProps) {
  return (
    <nav
      aria-label="Agent profile"
      className="sticky top-16 z-30 border-y border-border bg-background/95 backdrop-blur-xl"
    >
      <div className="mx-auto flex w-full max-w-7xl overflow-x-auto px-4 sm:px-6 lg:px-8">
        {agentProfileTabs.map((tab) => (
          <Link
            key={tab.value}
            href={buildAgentProfileTabHref(
              profile.chainId,
              profile.agentId,
              tab.value,
              comparisonGoal,
            )}
            aria-current={activeTab === tab.value ? "page" : undefined}
            className={cn(
              "relative inline-flex min-h-14 shrink-0 items-center gap-2 px-4 text-sm font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/30",
              activeTab === tab.value && "text-foreground",
            )}
          >
            {tab.label}
            {tab.value === "services" && profile.services.length > 0 ? (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
                {profile.services.length}
              </span>
            ) : null}
            {activeTab === tab.value ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand"
              />
            ) : null}
          </Link>
        ))}
      </div>
    </nav>
  );
}
