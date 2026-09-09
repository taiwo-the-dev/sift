import {
  Braces,
  ExternalLink,
  RadioTower,
  ServerCog,
  ShieldCheck,
  Zap,
} from "lucide-react";

import { CopyButton } from "@/components/agents/copy-button";
import { ProfileSection } from "@/components/agents/profile-section";
import {
  formatProfileTimestamp,
  formatResponseTime,
} from "@/features/agents/format";
import { normalizeExternalHref } from "@/features/agents/links";
import type {
  AgentProfile,
  AgentProfileService,
} from "@/features/agents/model";
import {
  collectDeclaredCapabilities,
  describeDeclaredService,
} from "@/features/agents/presentation";
import { formatServiceType } from "@/features/discovery/format";
import { cn } from "@/lib/utils";

interface ProfileCapabilitiesProps {
  profile: AgentProfile;
}

interface ServiceFactProps {
  label: string;
  value: string;
}

function ServiceFact({ label, value }: ServiceFactProps) {
  return (
    <div className="min-w-0 bg-background/55 p-3.5">
      <dt className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1.5 truncate text-xs font-semibold text-foreground" title={value}>
        {value}
      </dd>
    </div>
  );
}

function describeTransport(endpoint: string | null): string {
  if (!endpoint) {
    return "Not available";
  }

  try {
    const url = new URL(endpoint);

    if (url.protocol === "https:") {
      return "HTTPS";
    }

    if (url.protocol === "http:") {
      return "HTTP";
    }

    return url.protocol.replace(":", "").toUpperCase() || "Not available";
  } catch {
    return "Not available";
  }
}

function serviceHealth(
  profile: AgentProfile,
  service: AgentProfileService,
): Readonly<{
  lastChecked: string;
  latency: string;
  status: string;
}> {
  const health = profile.health;
  const matchesObservation = Boolean(
    health?.checkedEndpoint &&
      service.endpoint &&
      health.checkedEndpoint === service.endpoint,
  );

  if (!health || !matchesObservation) {
    return {
      lastChecked: "Not observed",
      latency: "Not observed",
      status: "Not observed",
    };
  }

  return {
    lastChecked: formatProfileTimestamp(health.lastCheckedAt),
    latency: formatResponseTime(health.responseTimeMs),
    status: health.status,
  };
}

export function ProfileCapabilities({ profile }: ProfileCapabilitiesProps) {
  const capabilities = collectDeclaredCapabilities(profile.services);
  const protocolCount = new Set(
    profile.services.map((service) => service.serviceType.toLowerCase()),
  ).size;

  return (
    <ProfileSection
      id="services"
      eyebrow="Agent interfaces"
      title="Services"
      description="Services and capabilities published in the agent's ERC-8004 profile."
    >
      <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
              <ServerCog className="size-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-lg font-semibold text-foreground">
                Service summary
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Published services and latest health checks
              </p>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-6 sm:flex sm:gap-8">
          <div>
            <dt className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Endpoints
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-foreground">
              {profile.services.length}
            </dd>
          </div>
          <div>
            <dt className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Protocols
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-foreground">
              {protocolCount}
            </dd>
          </div>
        </dl>
      </div>

      {profile.services.length > 0 ? (
        <div className="mt-5 space-y-4">
          {profile.services.map((service, index) => {
            const endpointHref = normalizeExternalHref(service.endpoint);
            const health = serviceHealth(profile, service);
            const serviceCapabilities = collectDeclaredCapabilities([service]);
            const description = describeDeclaredService(service);

            return (
              <article
                key={`${service.serviceType}:${service.endpoint ?? ""}:${service.version ?? ""}:${index}`}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
                  <div className="flex min-w-0 gap-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-sky-400/20 bg-sky-400/8 text-sky-200">
                      <RadioTower className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground sm:text-lg">
                          {formatServiceType(service.serviceType)}
                        </h3>
                        <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
                          {service.version
                            ? `Version ${service.version}`
                            : "Version not listed"}
                        </span>
                      </div>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                        {description ??
                          "No description is available for this service."}
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize",
                      health.status.includes("online")
                        ? "border-emerald-400/25 bg-emerald-400/8 text-emerald-200"
                        : "border-border bg-background text-muted-foreground",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 rounded-full",
                        health.status.includes("online")
                          ? "bg-emerald-300"
                          : "bg-muted-foreground",
                      )}
                    />
                    {health.status}
                  </span>
                </div>

                <div className="border-y border-border bg-background/45 px-5 py-4 sm:px-6">
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                    Service address
                  </p>
                  {service.endpoint ? (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                      <code className="min-w-0 flex-1 truncate text-xs text-foreground" title={service.endpoint}>
                        {service.endpoint}
                      </code>
                      <CopyButton label="service address" value={service.endpoint} />
                      {endpointHref ? (
                        <a
                          href={endpointHref}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label="Open service address"
                          title="Open service address"
                          className="grid size-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
                        >
                          <ExternalLink className="size-3.5" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      No service address was supplied.
                    </p>
                  )}
                </div>

                <dl className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
                  <ServiceFact label="Health" value={health.status} />
                  <ServiceFact label="Latency" value={health.latency} />
                  <ServiceFact
                    label="Transport"
                    value={describeTransport(service.endpoint)}
                  />
                  <ServiceFact
                    label="x402"
                    value={
                      profile.x402Supported === null
                        ? "Not listed"
                        : profile.x402Supported
                          ? "Supported"
                          : "Not listed"
                    }
                  />
                  <ServiceFact label="Last checked" value={health.lastChecked} />
                </dl>

                {serviceCapabilities.length > 0 ? (
                  <div className="p-5 sm:p-6">
                    <p className="inline-flex items-center gap-2 text-[0.68rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                      <Braces className="size-3.5 text-brand" aria-hidden="true" />
                      Capabilities
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {serviceCapabilities.map((capability) => (
                        <span
                          key={capability}
                          className="rounded-md border border-brand/20 bg-brand/8 px-2.5 py-1 text-xs font-medium text-foreground"
                        >
                          {capability}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <RadioTower className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-foreground">
            No services listed
          </p>
          <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-muted-foreground">
            This agent has not published a supported service.
          </p>
        </div>
      )}

      {capabilities.length > 0 ? (
        <div className="mt-8 grid gap-4 rounded-2xl border border-border bg-[linear-gradient(135deg,rgba(240,185,11,0.08),transparent_55%)] p-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-6">
          <span className="grid size-10 place-items-center rounded-xl border border-brand/20 bg-brand/10 text-brand">
            <Zap className="size-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Capabilities
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Taken from the agent’s published skills, capabilities, domains, and tags.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {capabilities.map((capability) => (
                <span
                  key={capability}
                  className="rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  {capability}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 text-xs leading-5 text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
        <p>
          Service information comes from the agent. Health checks are shown separately.
        </p>
      </div>
    </ProfileSection>
  );
}
