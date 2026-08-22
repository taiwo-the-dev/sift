import { Braces, RadioTower } from "lucide-react";

import { ProfileSection } from "@/components/agents/profile-section";
import type { AgentProfile } from "@/features/agents/model";
import { collectDeclaredCapabilities } from "@/features/agents/presentation";
import { formatServiceType } from "@/features/discovery/format";

interface ProfileCapabilitiesProps {
  profile: AgentProfile;
}

export function ProfileCapabilities({ profile }: ProfileCapabilitiesProps) {
  const capabilities = collectDeclaredCapabilities(profile.services);

  return (
    <ProfileSection
      id="capabilities"
      eyebrow="02 · Capabilities"
      title="Declared interfaces and skills"
      description="These values come from registration metadata. They describe what the agent publishes, not what Sift has independently tested."
    >
      {profile.services.length > 0 ? (
        <div className="divide-y divide-border border-y border-border">
          {profile.services.map((service, index) => (
            <article
              key={`${service.serviceType}:${service.endpoint ?? ""}:${service.version ?? ""}:${index}`}
              className="grid gap-3 py-5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-5"
            >
              <span className="grid size-10 place-items-center rounded-lg border border-brand/20 bg-brand/8 text-brand">
                <RadioTower className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-base font-semibold text-foreground">
                  {formatServiceType(service.serviceType)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Service declared by indexed agent metadata
                </p>
              </div>
              <span className="justify-self-start rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground sm:justify-self-end">
                {service.version ? `Version ${service.version}` : "Version unavailable"}
              </span>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-10 text-center">
          <RadioTower className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            No service declarations available
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-muted-foreground">
            The indexed identity does not currently expose a normalized service
            declaration.
          </p>
        </div>
      )}

      <div className="mt-8">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <Braces className="size-4 text-brand" aria-hidden="true" />
          Declared capability labels
        </p>
        {capabilities.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {capabilities.map((capability) => (
              <span
                key={capability}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
              >
                {capability}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Not available</p>
        )}
      </div>
    </ProfileSection>
  );
}
