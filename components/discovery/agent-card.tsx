import {
  ArrowUpRight,
  BadgeCheck,
  CircleAlert,
  Database,
  Gauge,
  RadioTower,
  Tag,
} from "lucide-react";
import Link from "next/link";

import { BookmarkToggle } from "@/components/bookmarks/bookmark-toggle";
import { ComparisonToggle } from "@/components/comparison/comparison-toggle";
import { AgentAvatar } from "@/components/discovery/agent-avatar";
import { buildAgentProfileHref } from "@/features/agents/route";
import {
  formatAgentDescription,
  formatAgentName,
  formatCategory,
  formatChainName,
  formatMetadataStatus,
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
  comparisonGoal?: string;
}

const metadataStatusStyles = {
  invalid: "border-amber-400/20 bg-amber-400/8 text-amber-200",
  pending: "border-sky-400/20 bg-sky-400/8 text-sky-200",
  unavailable: "border-border bg-secondary text-muted-foreground",
  valid: "border-emerald-400/20 bg-emerald-400/8 text-emerald-200",
} as const;

export function AgentCard({ agent, comparisonGoal = "" }: AgentCardProps) {
  const agentName = formatAgentName(agent.name, agent.agentId);
  const baseProfileHref = buildAgentProfileHref(agent.chainId, agent.agentId);
  const profileHref =
    baseProfileHref && comparisonGoal
      ? `${baseProfileHref}?${new URLSearchParams({
          goal: comparisonGoal,
        }).toString()}`
      : baseProfileHref;
  const uniqueServices = [
    ...new Set(
      agent.services.map((service) => formatServiceType(service.serviceType)),
    ),
  ];
  const visibleServices = uniqueServices.slice(0, 3);
  const hiddenServiceCount = Math.max(
    0,
    uniqueServices.length - visibleServices.length,
  );
  const primaryCategory = agent.categories[0];
  const hiddenCategoryCount = Math.max(0, agent.categories.length - 1);

  return (
    <article className="sift-card-reveal group rounded-xl border border-border bg-card p-4 transition-[border-color,background-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-brand/35 hover:bg-card/95 hover:shadow-[0_18px_44px_rgba(0,0,0,0.2)] motion-reduce:transform-none sm:p-5">
      <div className="grid min-w-0 grid-cols-[4rem_minmax(0,1fr)] items-start gap-4 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-5">
        <AgentAvatar
          agentId={agent.agentId}
          imageUrl={agent.imageUrl}
          name={agentName}
        />

        <div className="min-w-0">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-brand">
                  <Database className="size-3" aria-hidden="true" />
                  {formatChainName(agent.chainId)}
                </span>
                <span
                  className="size-1 rounded-full bg-border"
                  aria-hidden="true"
                />
                {primaryCategory ? (
                  <span
                    title={
                      agent.categorySource === "deterministic-rule"
                        ? "Suggested from verified profile evidence"
                        : "Published in verified profile metadata"
                    }
                    className="inline-flex min-w-0 items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-brand"
                  >
                    <Tag className="size-3" aria-hidden="true" />
                    <span className="truncate">
                      {formatCategory(primaryCategory)}
                    </span>
                  </span>
                ) : (
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Category not available
                  </span>
                )}
                {hiddenCategoryCount > 0 ? (
                  <span className="text-[0.65rem] font-medium text-muted-foreground">
                    +{hiddenCategoryCount} more
                  </span>
                ) : null}
              </div>

              <h2 className="mt-2 truncate text-lg font-semibold tracking-[-0.025em] text-foreground sm:text-xl">
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
                Agent #{agent.agentId}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              <BookmarkToggle agent={agent} variant="icon" />
              <ComparisonToggle
                reference={{ agentId: agent.agentId, chainId: agent.chainId }}
                goal={comparisonGoal}
                variant="compact"
              />
            </div>
          </div>

          <p className="mt-3 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {formatAgentDescription(agent.description)}
          </p>

          <div className="mt-4 flex flex-col gap-3 border-t border-border/70 pt-3 sm:flex-row sm:items-center sm:justify-between">
            {visibleServices.length > 0 ? (
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {visibleServices.map((service) => (
                  <span
                    key={service}
                    className="rounded-md border border-border bg-background/70 px-2 py-1 text-[0.68rem] font-medium text-foreground"
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
              <span className="text-xs text-muted-foreground">
                Services not listed
              </span>
            )}

            <dl className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground sm:justify-end">
              <div className="flex items-center gap-2">
                <RadioTower
                  className="size-3.5 shrink-0 text-brand"
                  aria-hidden="true"
                />
                <div>
                  <dt className="sr-only">Health status</dt>
                  <dd className="capitalize">
                    {agent.health
                      ? `${isHealthStale(agent.health) ? "Stale " : ""}${
                          agent.health.status
                        }`
                      : "Unknown health"}
                  </dd>
                </div>
              </div>
              {agent.score && agent.score.score !== null ? (
                <div
                  className="flex items-center gap-2"
                  title={
                    isScoreStale(agent.score.calculatedAt)
                      ? "This score needs refreshing"
                      : `${describeScoreConfidence(agent.score.confidence)} confidence`
                  }
                >
                  <Gauge
                    className="size-3.5 shrink-0 text-brand"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="sr-only">Sift Score</dt>
                    <dd>
                      Score {agent.score.score}
                      {isScoreStale(agent.score.calculatedAt) ? " · Stale" : ""}
                    </dd>
                  </div>
                </div>
              ) : null}
              <div
                className={cn(
                  "flex items-center gap-1.5",
                  metadataStatusStyles[agent.metadataStatus],
                  "border-0 bg-transparent p-0",
                )}
              >
                {agent.metadataStatus === "valid" ? (
                  <BadgeCheck className="size-3.5" aria-hidden="true" />
                ) : (
                  <CircleAlert className="size-3.5" aria-hidden="true" />
                )}
                <div>
                  <dt className="sr-only">Profile status</dt>
                  <dd>{formatMetadataStatus(agent.metadataStatus)}</dd>
                </div>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </article>
  );
}
