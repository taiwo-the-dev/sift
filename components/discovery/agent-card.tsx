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
import {
  formatActivationMethod,
  isActivationEvidenceCurrent,
  type ActivationMethod,
} from "@/features/activation/model";
import { shouldShowOtherCategory } from "@/features/categories/presentation";
import {
  formatAgentDescription,
  formatAgentName,
  formatCategory,
  formatChainName,
  formatMetadataStatus,
} from "@/features/discovery/format";
import type { DiscoveryAgent } from "@/features/discovery/model";
import { formatHealthCheckTime } from "@/features/health/presentation";
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

const healthValueStyles = {
  degraded: "text-amber-200",
  offline: "text-red-300",
  online: "text-emerald-200",
  unknown: "text-muted-foreground",
} as const;

const activationMethodPriority = {
  erc8183: 0,
  a2a: 1,
  mcp: 2,
  x402: 3,
} as const satisfies Readonly<Record<ActivationMethod, number>>;

function Signal({
  detail,
  icon,
  label,
  value,
  valueClassName,
}: Readonly<{
  detail: string;
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}>) {
  return (
    <div className="min-w-0 px-3 py-3 first:pl-0 last:pr-0 sm:px-4">
      <dt className="flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 truncate text-sm font-semibold text-foreground",
          valueClassName,
        )}
      >
        {value}
      </dd>
      <dd
        className="mt-0.5 truncate text-[0.65rem] text-muted-foreground"
        title={detail}
      >
        {detail}
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
  const taskMethods = agent.services
    .reduce<ActivationMethod[]>((methods, service) => {
      if (
        service.activationMethod &&
        service.endpoint &&
        isActivationEvidenceCurrent({
          lastSuccessAt: service.availabilityLastSuccessAt,
          status: service.availabilityStatus,
        }) &&
        !methods.includes(service.activationMethod)
      ) {
        methods.push(service.activationMethod);
      }
      return methods;
    }, [])
    .sort(
      (left, right) =>
        activationMethodPriority[left] - activationMethodPriority[right],
    );
  const taskReady = taskMethods.length > 0;
  const primaryTaskMethod = taskMethods[0] ?? null;
  const taskMethodSummary = taskMethods
    .map((method) => formatActivationMethod(method))
    .join(" · ");
  const actionHref = primaryTaskMethod
    ? primaryTaskMethod === "erc8183"
      ? `/hire/${agent.chainId}/${agent.agentId}`
      : `/start/${agent.chainId}/${agent.agentId}`
    : profileHref;
  const actionLabel =
    primaryTaskMethod === "erc8183"
      ? "Hire agent"
      : primaryTaskMethod === "a2a"
        ? "Send task"
        : primaryTaskMethod === "mcp"
          ? "Run tool"
          : primaryTaskMethod === "x402"
            ? "View paid access"
            : "View agent";
  const healthStatus = agent.health?.status ?? "unknown";
  const healthValue = !agent.health
    ? "Not checked"
    : agent.health.status.charAt(0).toUpperCase() + agent.health.status.slice(1);
  const healthDetail = agent.health
    ? `Checked ${formatHealthCheckTime(agent.health.lastCheckedAt)}`
    : "No health check";
  const healthStyle = healthValueStyles[healthStatus];
  const scoreIsStale = agent.score
    ? isScoreStale(agent.score.calculatedAt)
    : false;
  const scoreValue =
    agent.score?.score !== null && agent.score?.score !== undefined
      ? `${agent.score.score}/100`
      : "Not available";
  const scoreDetail = agent.score
    ? scoreIsStale
      ? "Refresh needed"
      : `${describeScoreConfidence(agent.score.confidence)} confidence`
    : "Awaiting evidence";
  const identityTags = (
    <div className="flex min-h-7 flex-wrap items-center gap-2">
      {primaryCategory ? (
        <span
          title={
            agent.categorySource === "deterministic-rule"
              ? "Suggested from verified profile evidence"
              : "Published in verified profile metadata"
          }
          className="inline-flex h-7 min-w-0 max-w-full items-center gap-1.5 rounded-md border border-brand/20 bg-brand/7 px-2.5 text-[0.65rem] font-semibold text-brand"
        >
          <Tag className="size-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{formatCategory(primaryCategory)}</span>
        </span>
      ) : showOtherCategory ? (
        <span className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background/50 px-2.5 text-[0.65rem] font-semibold text-muted-foreground">
          <Tag className="size-3" aria-hidden="true" />
          Other
        </span>
      ) : (
        <span className="inline-flex h-7 items-center rounded-md border border-border bg-background/50 px-2.5 text-[0.65rem] font-medium text-muted-foreground">
          Category not available
        </span>
      )}
      {hiddenCategoryCount > 0 ? (
        <span className="inline-flex h-7 items-center text-[0.65rem] font-medium text-muted-foreground">
          +{hiddenCategoryCount} more
        </span>
      ) : null}
      <span
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-[0.65rem] font-semibold",
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
  );
  const decisionSignals = (
    <>
      <Signal
        icon={<BriefcaseBusiness className="size-3" aria-hidden="true" />}
        label="Access"
        value={taskReady ? "Available" : "Not confirmed"}
        detail={taskReady ? taskMethodSummary : "No recent check"}
        valueClassName={taskReady ? "text-emerald-200" : undefined}
      />
      <Signal
        icon={<RadioTower className="size-3" aria-hidden="true" />}
        label="Health"
        value={healthValue}
        detail={healthDetail}
        valueClassName={healthStyle}
      />
      <Signal
        icon={<Gauge className="size-3" aria-hidden="true" />}
        label="Sift Score"
        value={scoreValue}
        detail={scoreDetail}
      />
    </>
  );

  return (
    <article className="sift-card-reveal group relative flex h-full min-h-[24rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-brand/35 hover:shadow-[0_22px_50px_rgba(0,0,0,0.26)] motion-reduce:transform-none">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_12%_-60%,rgba(240,185,11,0.18),transparent_15rem)]"
      />

      <div className="relative flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.09em] text-muted-foreground">
          <span className="inline-flex shrink-0 items-center gap-1.5 text-brand">
            <Database className="size-3" aria-hidden="true" />
            {formatChainName(agent.chainId)}
          </span>
          <span className="size-1 shrink-0 rounded-full bg-border" aria-hidden="true" />
          <span className="truncate font-mono normal-case tracking-normal">
            Agent #{agent.agentId}
          </span>
        </div>
        <BookmarkToggle agent={agent} variant="icon" />
      </div>

      <div className="relative mt-5 flex min-w-0 items-center gap-4">
        <div className="relative shrink-0 rounded-full bg-background p-1 ring-1 ring-border">
          <AgentAvatar
            agentId={agent.agentId}
            imageUrl={agent.imageUrl}
            name={agentName}
          />
          {taskReady ? (
            <span className="absolute right-0.5 bottom-0.5 size-3.5 rounded-full border-2 border-card bg-emerald-400">
              <span className="sr-only">Available for tasks</span>
            </span>
          ) : null}
        </div>

        <div className="min-w-0">
          <h2 className="line-clamp-2 text-xl leading-6 font-semibold tracking-[-0.03em] text-foreground">
            {profileHref ? (
              <Link
                href={profileHref}
                prefetch={false}
                className="rounded-sm outline-none transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {agentName}
              </Link>
            ) : (
              agentName
            )}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {taskReady ? taskMethodSummary : "Profile available for review"}
          </p>
        </div>
      </div>

      <p className="mt-5 line-clamp-3 text-sm leading-6 text-muted-foreground">
        {formatAgentDescription(agent.description)}
      </p>

      <div className="mt-4">{identityTags}</div>

      <dl className="mt-5 grid grid-cols-3 divide-x divide-border border-y border-border">
        {decisionSignals}
      </dl>

      <div className="mt-auto flex items-center gap-2 pt-5">
        <ComparisonToggle
          className="border-border bg-background text-foreground hover:border-input hover:bg-muted hover:text-foreground"
          reference={{ agentId: agent.agentId, chainId: agent.chainId }}
          goal={comparisonGoal}
          variant="compact"
        />
        {actionHref ? (
          <Link
            href={actionHref}
            prefetch={false}
            className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-brand bg-brand px-3 text-xs font-semibold text-brand-foreground outline-none transition-[background-color,box-shadow,transform] hover:-translate-y-0.5 hover:bg-brand-hover hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/30 motion-reduce:transform-none"
          >
            {actionLabel}
            <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
