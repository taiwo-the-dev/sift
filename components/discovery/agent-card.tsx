import {
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CircleAlert,
  Database,
  Gauge,
  RadioTower,
  Tag,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BookmarkToggle } from "@/components/bookmarks/bookmark-toggle";
import { ComparisonToggle } from "@/components/comparison/comparison-toggle";
import { AgentAvatar } from "@/components/discovery/agent-avatar";
import { buildAgentProfileHref } from "@/features/agents/route";
import { shouldShowOtherCategory } from "@/features/categories/presentation";
import {
  formatAgentDescription,
  formatAgentName,
  formatCategory,
  formatChainName,
  formatMetadataStatus,
} from "@/features/discovery/format";
import type { DiscoveryAgent } from "@/features/discovery/model";
import { isHealthStale } from "@/features/health/presentation";
import { hasCurrentActivation } from "@/features/activation/model";
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

const healthStatusStyles = {
  degraded: "text-amber-200",
  offline: "text-red-300",
  online: "text-emerald-200",
  unknown: "text-muted-foreground",
} as const;

function EvidenceItem({
  icon,
  label,
  value,
  valueClassName,
}: Readonly<{
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}>) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 truncate text-xs font-semibold text-foreground",
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function AgentCard({ agent, comparisonGoal = "" }: AgentCardProps) {
  const agentName = formatAgentName(agent.name, agent.agentId);
  const baseProfileHref = buildAgentProfileHref(agent.chainId, agent.agentId);
  const profileHref =
    baseProfileHref && comparisonGoal
      ? `${baseProfileHref}?${new URLSearchParams({
          goal: comparisonGoal,
        }).toString()}`
      : baseProfileHref;
  const primaryCategory = agent.categories[0];
  const showOtherCategory = shouldShowOtherCategory(
    agent.metadataStatus,
    agent.categories,
  );
  const hiddenCategoryCount = Math.max(0, agent.categories.length - 1);
  const taskReady = hasCurrentActivation(agent.services);
  const healthStatus = agent.health?.status ?? "unknown";
  const healthValue = agent.health
    ? `${isHealthStale(agent.health) ? "Stale " : ""}${agent.health.status}`
    : "Not checked";
  const scoreValue =
    agent.score?.score !== null && agent.score?.score !== undefined
      ? `${agent.score.score}/100${isScoreStale(agent.score.calculatedAt) ? " · Stale" : ""}`
      : "Not available";

  return (
    <article className="sift-card-reveal group relative overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-brand/35 hover:shadow-[0_20px_48px_rgba(0,0,0,0.24)] motion-reduce:transform-none">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/55 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="grid min-w-0 md:grid-cols-[10.75rem_minmax(0,1fr)]">
        <div className="relative overflow-hidden border-b border-border bg-[radial-gradient(circle_at_15%_0%,rgba(240,185,11,0.18),transparent_9rem),linear-gradient(145deg,rgba(255,255,255,0.025),transparent)] p-4 md:border-r md:border-b-0 md:p-5">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(234,236,239,0.2)_0.7px,transparent_0.7px)] [background-size:12px_12px]"
          />
          <div className="relative flex items-center gap-4 md:h-full md:min-h-44 md:flex-col md:items-start">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 bg-black/20 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-brand backdrop-blur-sm">
              <Database className="size-3" aria-hidden="true" />
              {formatChainName(agent.chainId)}
            </span>

            <div className="relative shrink-0 md:my-auto md:self-center">
              <div className="rounded-full bg-black/20 p-1 ring-1 ring-white/8">
                <AgentAvatar
                  agentId={agent.agentId}
                  imageUrl={agent.imageUrl}
                  name={agentName}
                />
              </div>
              {taskReady ? (
                <span
                  title="Available for tasks"
                  className="absolute right-0.5 bottom-0.5 size-3.5 rounded-full border-2 border-card bg-emerald-400"
                >
                  <span className="sr-only">Available for tasks</span>
                </span>
              ) : null}
            </div>

            <p className="ml-auto min-w-0 truncate font-mono text-[0.65rem] text-muted-foreground md:ml-0 md:w-full md:text-center">
              ERC-8004 #{agent.agentId}
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-[-0.03em] text-foreground sm:text-2xl">
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

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {primaryCategory ? (
                  <span
                    title={
                      agent.categorySource === "deterministic-rule"
                        ? "Suggested from verified profile evidence"
                        : "Published in verified profile metadata"
                    }
                    className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-brand/20 bg-brand/7 px-2.5 py-1 text-[0.65rem] font-semibold text-brand"
                  >
                    <Tag className="size-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">
                      {formatCategory(primaryCategory)}
                    </span>
                  </span>
                ) : showOtherCategory ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/50 px-2.5 py-1 text-[0.65rem] font-semibold text-muted-foreground">
                    <Tag className="size-3" aria-hidden="true" />
                    Other
                  </span>
                ) : (
                  <span className="rounded-md border border-border bg-background/50 px-2.5 py-1 text-[0.65rem] font-medium text-muted-foreground">
                    Category not available
                  </span>
                )}
                {hiddenCategoryCount > 0 ? (
                  <span className="text-[0.65rem] font-medium text-muted-foreground">
                    +{hiddenCategoryCount} more
                  </span>
                ) : null}
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-[0.65rem] font-semibold",
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

            <div className="flex shrink-0 items-center gap-2">
              <BookmarkToggle agent={agent} variant="icon" />
              <ComparisonToggle
                reference={{ agentId: agent.agentId, chainId: agent.chainId }}
                goal={comparisonGoal}
                variant="compact"
              />
            </div>
          </div>

          <p className="mt-4 line-clamp-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {formatAgentDescription(agent.description)}
          </p>

          <div className="mt-5 flex flex-col gap-4 border-t border-border/75 pt-4 lg:flex-row lg:items-end lg:justify-between">
            <dl className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
              <EvidenceItem
                icon={<RadioTower className="size-3 text-brand" aria-hidden="true" />}
                label="Health"
                value={healthValue}
                valueClassName={cn("capitalize", healthStatusStyles[healthStatus])}
              />
              <div
                title={
                  agent.score
                    ? isScoreStale(agent.score.calculatedAt)
                      ? "This score needs refreshing"
                      : `${describeScoreConfidence(agent.score.confidence)} confidence`
                    : "Sift has not recorded enough current evidence to publish a score."
                }
              >
                <EvidenceItem
                  icon={<Gauge className="size-3 text-brand" aria-hidden="true" />}
                  label="Sift Score"
                  value={scoreValue}
                />
              </div>
              {taskReady ? (
                <EvidenceItem
                  icon={<BriefcaseBusiness className="size-3 text-emerald-300" aria-hidden="true" />}
                  label="Task access"
                  value="Available"
                  valueClassName="text-emerald-200"
                />
              ) : null}
            </dl>

            {profileHref ? (
              <Link
                href={profileHref}
                prefetch={false}
                className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-xs font-semibold text-foreground outline-none transition-[border-color,background-color,color] hover:border-brand/35 hover:bg-brand hover:text-brand-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                View profile
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
