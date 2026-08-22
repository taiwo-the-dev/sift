import {
  ArrowUpRight,
  BadgeCheck,
  Blocks,
  CalendarDays,
  CircleAlert,
  Database,
  Gauge,
  RadioTower,
  Tag,
} from "lucide-react";
import Link from "next/link";

import { AgentAvatar } from "@/components/discovery/agent-avatar";
import { buildAgentProfileHref } from "@/features/agents/route";
import {
  formatAgentDescription,
  formatAgentName,
  formatCategory,
  formatChainName,
  formatMetadataStatus,
  formatRegistrationDate,
  formatServiceType,
} from "@/features/discovery/format";
import type { DiscoveryAgent } from "@/features/discovery/model";
import { isHealthStale } from "@/features/health/presentation";
import {
  describeScoreConfidence,
  isScoreStale,
} from "@/features/scoring/presentation";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agent: DiscoveryAgent;
}

const metadataStatusStyles = {
  invalid: "border-amber-400/20 bg-amber-400/8 text-amber-200",
  pending: "border-sky-400/20 bg-sky-400/8 text-sky-200",
  unavailable: "border-border bg-secondary text-muted-foreground",
  valid: "border-emerald-400/20 bg-emerald-400/8 text-emerald-200",
} as const;

export function AgentCard({ agent }: AgentCardProps) {
  const agentName = formatAgentName(agent.name, agent.agentId);
  const profileHref = buildAgentProfileHref(agent.chainId, agent.agentId);
  const visibleServices = [
    ...new Set(
      agent.services.map((service) => formatServiceType(service.serviceType)),
    ),
  ].slice(0, 5);
  const hiddenServiceCount = Math.max(
    0,
    agent.services.length - visibleServices.length,
  );

  return (
    <article className="group rounded-xl border border-border bg-card p-4 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-px hover:border-brand/35 hover:bg-card/95 sm:p-5">
      <div className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-5">
        <AgentAvatar
          agentId={agent.agentId}
          imageUrl={agent.imageUrl}
          name={agentName}
        />

        <div className="min-w-0">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {agent.categories.slice(0, 2).map((category) => (
                  <span
                    key={category}
                    title={
                      agent.categorySource === "deterministic-keyword"
                        ? "Deterministically matched from indexed metadata keywords"
                        : "Category supplied by indexed metadata"
                    }
                    className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-brand"
                  >
                    <Tag className="size-3" aria-hidden="true" />
                    {formatCategory(category)}
                  </span>
                ))}
                {agent.categories.length === 0 ? (
                  <span className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Category not available
                  </span>
                ) : null}
              </div>

              <h2 className="mt-1.5 truncate text-lg font-semibold tracking-[-0.025em] text-foreground sm:text-xl">
                {profileHref ? (
                  <Link
                    href={profileHref}
                    prefetch={false}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-sm outline-none transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    <span className="truncate">{agentName}</span>
                    <ArrowUpRight
                      className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand"
                      aria-hidden="true"
                    />
                  </Link>
                ) : (
                  agentName
                )}
              </h2>
              <p className="mt-1 font-mono text-[0.68rem] text-muted-foreground">
                ERC-8004 agent #{agent.agentId}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              {agent.score ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-brand/25 bg-brand/8 px-2.5 py-1 text-[0.7rem] font-semibold text-brand">
                  <Gauge className="size-3" aria-hidden="true" />
                  {agent.score.score === null
                    ? "Score unavailable"
                    : `Sift Score ${agent.score.score} · ${
                        isScoreStale(agent.score.calculatedAt)
                          ? "Stale"
                          : describeScoreConfidence(
                        agent.score.confidence,
                            )
                      }`}
                </span>
              ) : null}
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold",
                  metadataStatusStyles[agent.metadataStatus],
                )}
              >
                {agent.metadataStatus === "valid" ? (
                  <BadgeCheck className="size-3" aria-hidden="true" />
                ) : (
                  <CircleAlert className="size-3" aria-hidden="true" />
                )}
                {formatMetadataStatus(agent.metadataStatus)}
              </span>
            </div>
          </div>

          <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {formatAgentDescription(agent.description)}
          </p>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Declared capabilities
              </p>
              {visibleServices.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {visibleServices.map((service) => (
                    <span
                      key={service}
                      className="rounded-md border border-border bg-background px-2 py-1 text-[0.7rem] font-medium text-foreground"
                    >
                      {service}
                    </span>
                  ))}
                  {hiddenServiceCount > 0 ? (
                    <span className="px-1.5 py-1 text-[0.7rem] text-muted-foreground">
                      +{hiddenServiceCount} more
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Not available
                </p>
              )}
            </div>

            <dl className="grid shrink-0 grid-cols-1 gap-x-5 gap-y-2 text-xs text-muted-foreground sm:grid-cols-2 xl:max-w-lg xl:grid-cols-4">
              <div className="flex items-center gap-2">
                <RadioTower
                  className="size-3.5 shrink-0 text-brand"
                  aria-hidden="true"
                />
                <div>
                  <dt className="sr-only">Observed reachability</dt>
                  <dd className="capitalize">
                    {agent.health
                      ? `${isHealthStale(agent.health) ? "Stale " : ""}${
                          agent.health.status
                        }`
                      : "Unknown health"}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Blocks
                  className="size-3.5 shrink-0 text-brand"
                  aria-hidden="true"
                />
                <div>
                  <dt className="sr-only">Identity source</dt>
                  <dd>ERC-8004</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays
                  className="size-3.5 shrink-0 text-brand"
                  aria-hidden="true"
                />
                <div>
                  <dt className="sr-only">Registration date</dt>
                  <dd>{formatRegistrationDate(agent.registeredAt)}</dd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Database
                  className="size-3.5 shrink-0 text-brand"
                  aria-hidden="true"
                />
                <div>
                  <dt className="sr-only">Network</dt>
                  <dd>{formatChainName(agent.chainId)}</dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </article>
  );
}
