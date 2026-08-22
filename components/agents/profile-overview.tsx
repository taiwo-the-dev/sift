import { Blocks, CircleDot, RadioTower, Tags } from "lucide-react";

import { ProfileSection } from "@/components/agents/profile-section";
import type { AgentProfile } from "@/features/agents/model";
import {
  formatAgentDescription,
  formatCategory,
  formatServiceType,
} from "@/features/discovery/format";

interface ProfileOverviewProps {
  profile: AgentProfile;
}

export function ProfileOverview({ profile }: ProfileOverviewProps) {
  const serviceTypes = [
    ...new Set(
      profile.services.map((service) =>
        formatServiceType(service.serviceType),
      ),
    ),
  ];

  return (
    <ProfileSection
      id="overview"
      eyebrow="01 · Overview"
      title="What this agent says it does"
      description="A human-readable summary from the latest available indexed registration metadata."
    >
      <div className="border-l-2 border-brand pl-5 sm:pl-7">
        <p className="text-pretty text-xl leading-8 text-foreground sm:text-2xl sm:leading-9">
          {formatAgentDescription(profile.description)}
        </p>
        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          This is a declared description, not independent proof of performance.
        </p>
      </div>

      <dl className="mt-8 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
        <div className="bg-card p-5">
          <dt className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Tags className="size-4 text-brand" aria-hidden="true" />
            Category
          </dt>
          <dd className="mt-3 text-sm font-medium text-foreground">
            {profile.categories.length > 0
              ? profile.categories.map(formatCategory).join(", ")
              : "Not available"}
          </dd>
        </div>
        <div className="bg-card p-5">
          <dt className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <RadioTower className="size-4 text-brand" aria-hidden="true" />
            Declared services
          </dt>
          <dd className="mt-3 text-sm font-medium text-foreground">
            {serviceTypes.length > 0
              ? serviceTypes.join(", ")
              : "Not available"}
          </dd>
        </div>
        <div className="bg-card p-5">
          <dt className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <CircleDot className="size-4 text-brand" aria-hidden="true" />
            Declared active flag
          </dt>
          <dd className="mt-3 text-sm font-medium text-foreground">
            {profile.active === null
              ? "Not available"
              : profile.active
                ? "Active"
                : "Inactive"}
          </dd>
        </div>
        <div className="bg-card p-5">
          <dt className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <Blocks className="size-4 text-brand" aria-hidden="true" />
            x402 declaration
          </dt>
          <dd className="mt-3 text-sm font-medium text-foreground">
            {profile.x402Supported === null
              ? "Not available"
              : profile.x402Supported
                ? "Declared supported"
                : "Not declared"}
          </dd>
        </div>
      </dl>
    </ProfileSection>
  );
}
