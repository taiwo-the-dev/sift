import {
  ArrowUpRight,
  BadgeCheck,
  BriefcaseBusiness,
  CircleAlert,
  Gauge,
  RadioTower,
} from "lucide-react";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

import { AgentArtworkHeader } from "@/components/agents/agent-artwork-header";
import { BookmarkToggle } from "@/components/bookmarks/bookmark-toggle";
import { ComparisonToggle } from "@/components/comparison/comparison-toggle";
import { AgentAvatar } from "@/components/discovery/agent-avatar";
import { AnimatedRatingValue } from "@/components/scoring/animated-rating-value";
import { buildAgentProfileHref } from "@/features/agents/route";
import {
  formatActivationMethod,
  isActivationEvidenceCurrent,
  type ActivationMethod,
} from "@/features/activation/model";
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
import {
  getHealthPresentation,
  type HealthPresentation,
} from "@/features/health/presentation";
import {
  describeScoreTier,
  getAgentRating,
  isScoreStale,
  type ScoreTier,
} from "@/features/scoring/presentation";
import { cn } from "@/lib/utils";

interface AgentCardProps {
  agent: DiscoveryAgent;
  comparisonGoal?: string;
  position?: number;
}

const metadataStatusStyles = {
  invalid: "border-amber-400/20 bg-amber-400/8 text-amber-200",
  pending: "border-sky-400/20 bg-sky-400/8 text-sky-200",
  unavailable: "border-border bg-secondary text-muted-foreground",
  valid: "border-emerald-400/20 bg-emerald-400/8 text-emerald-200",
} as const;

type SignalTone = "brand" | "caution" | "negative" | "neutral" | "positive";

const signalToneStyles = {
  brand: { value: "text-brand" },
  caution: { value: "text-amber-200" },
  negative: { value: "text-red-300" },
  neutral: { value: "text-foreground" },
  positive: { value: "text-emerald-200" },
} as const satisfies Readonly<
  Record<SignalTone, { value: string }>
>;

const scoreTierTone = {
  excellent: "positive",
  fair: "caution",
  good: "brand",
  unavailable: "neutral",
  weak: "negative",
} as const satisfies Readonly<Record<ScoreTier, SignalTone>>;

const healthStateTone = {
  "could-not-verify": "neutral",
  degraded: "caution",
  "no-checkable-service": "neutral",
  "not-checked": "neutral",
  offline: "negative",
  online: "positive",
} as const satisfies Readonly<Record<HealthPresentation["state"], SignalTone>>;

const activationMethodPriority = {
  erc8183: 0,
  a2a: 1,
  mcp: 2,
  x402: 3,
} as const satisfies Readonly<Record<ActivationMethod, number>>;

type SignalIcon = ComponentType<SVGProps<SVGSVGElement>>;

function StatusSignal({
  detail,
  icon,
  label,
  tone,
  value,
}: Readonly<{
  detail: string;
  icon: SignalIcon;
  label: string;
  tone: SignalTone;
  value: string;
}>) {
  const Icon = icon;

  return (
    <div
      title={`${label}: ${value} · ${detail}`}
      className="relative flex min-w-0 items-center gap-3 px-3.5 py-3"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-background/60 text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-[0.58rem] font-semibold tracking-[0.11em] text-muted-foreground uppercase">
          {label}
        </dt>
        <dd
          className={cn(
            "mt-0.5 truncate text-xs font-semibold",
            signalToneStyles[tone].value,
          )}
        >
          {value}
        </dd>
        <p className="mt-0.5 truncate text-[0.65rem] text-muted-foreground">
          {detail}
        </p>
      </div>
    </div>
  );
}

export function AgentCard({
  agent,
  comparisonGoal = "",
  position = 0,
}: AgentCardProps) {
  const agentName = formatAgentName(agent.name, agent.agentId);
  const baseProfileHref = buildAgentProfileHref(agent.chainId, agent.agentId);
  const profileHref =
    baseProfileHref && comparisonGoal
      ? `${baseProfileHref}?${new URLSearchParams({
          goal: comparisonGoal,
        }).toString()}`
      : baseProfileHref;
  const primaryCategory = agent.categories[0];
  const categoryTitle = primaryCategory
    ? agent.categories.length > 1
      ? `Also matches: ${agent.categories.slice(1).map(formatCategory).join(", ")}`
      : agent.categorySource === "deterministic-rule"
        ? "Suggested from verified profile evidence"
        : "Published in verified profile metadata"
    : "No category matched Sift's supported taxonomy";
  const serviceTypes = [
    ...new Set(
      agent.services.map((service) => formatServiceType(service.serviceType)),
    ),
  ].slice(0, 4);
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
  const healthPresentation = getHealthPresentation(agent.health, agent.services);
  const healthTierTone = healthStateTone[healthPresentation.state];
  const rating = getAgentRating(agent);
  const scoreIsStale =
    rating.kind !== "profile" && agent.score
      ? isScoreStale(agent.score.calculatedAt)
      : false;
  const scoreTier = describeScoreTier(rating.value);
  const scoreSignalTone = scoreTierTone[scoreTier.tier];
  const scoreDetail = scoreIsStale
    ? `${rating.detail} · refresh needed`
    : rating.detail;

  return (
    <article className="sift-card-reveal group flex h-full min-h-[24rem] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-background transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-brand/35 hover:shadow-[0_22px_50px_rgba(0,0,0,0.26)] motion-reduce:transform-none">
      <AgentArtworkHeader position={position}>
        <div className="flex items-center justify-between gap-3">
          <span
            title={categoryTitle}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold backdrop-blur-sm",
              primaryCategory
                ? "border-brand/25 bg-brand/15 text-brand"
                : "border-white/10 bg-black/25 text-white/70",
            )}
          >
            {primaryCategory ? formatCategory(primaryCategory) : "Other"}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold backdrop-blur-sm",
              metadataStatusStyles[agent.metadataStatus],
            )}
          >
            {agent.metadataStatus === "valid" ? (
              <BadgeCheck className="size-2.5" aria-hidden="true" />
            ) : (
              <CircleAlert className="size-2.5" aria-hidden="true" />
            )}
            {formatMetadataStatus(agent.metadataStatus)}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
          <div className="relative rounded-full bg-black/20 p-1 shadow-[0_14px_30px_rgba(0,0,0,0.28)] ring-1 ring-white/10">
            <AgentAvatar
              agentId={agent.agentId}
              imageUrl={agent.imageUrl}
              name={agentName}
            />
            {taskReady ? (
              <span className="absolute right-0.5 bottom-0.5 size-3.5 rounded-full border-2 border-background bg-emerald-400">
                <span className="sr-only">Available for tasks</span>
              </span>
            ) : null}
          </div>
          <div className="min-w-0">
            <p
              title={`Registered ${formatRegistrationDate(agent.registeredAt)}`}
              className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-white/50"
            >
              {formatChainName(agent.chainId)} · #{agent.agentId}
            </p>
            <h2 className="mt-1.5 line-clamp-2 text-xl leading-6 font-semibold tracking-[-0.03em] text-white">
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
          </div>
        </div>
      </AgentArtworkHeader>

      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
          {formatAgentDescription(agent.description)}
        </p>

        <dl className="mt-4 grid min-h-32 grid-cols-1 overflow-hidden rounded-xl border border-border bg-card/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)]">
          <div className="relative flex min-h-28 min-w-0 flex-col justify-between overflow-hidden border-b border-border p-3.5 sm:min-h-0 sm:border-r sm:border-b-0">
            <dt className="relative flex items-center gap-1.5 text-[0.58rem] font-semibold tracking-[0.11em] text-muted-foreground uppercase">
              <Gauge
                className={cn(
                  "size-3.5",
                  signalToneStyles[scoreSignalTone].value,
                )}
                aria-hidden="true"
              />
              {rating.label}
            </dt>
            <dd className="relative mt-3">
              <div className="flex items-end gap-1.5">
                <span
                  className={cn(
                    "text-3xl leading-none font-semibold tracking-[-0.05em] tabular-nums",
                    signalToneStyles[scoreSignalTone].value,
                  )}
                >
                  <AnimatedRatingValue value={rating.value} />
                </span>
                <span className="pb-0.5 text-[0.62rem] text-muted-foreground">
                  / 100
                </span>
              </div>
              <p
                className="mt-2 truncate text-[0.65rem] text-muted-foreground"
                title={`${scoreTier.label} · ${scoreDetail}`}
              >
                {scoreTier.label} · {scoreDetail}
              </p>
            </dd>
          </div>
          <div className="min-w-0 divide-y divide-border">
            <StatusSignal
              detail={taskReady ? taskMethodSummary : "No checked task service"}
              icon={BriefcaseBusiness}
              label="Access"
              value={taskReady ? "Available" : "Profile only"}
              tone={taskReady ? "positive" : "neutral"}
            />
            <StatusSignal
              detail={healthPresentation.detail}
              icon={RadioTower}
              label="Health"
              value={healthPresentation.label}
              tone={healthTierTone}
            />
          </div>
        </dl>

        <div className="mt-4">
          <p className="text-[0.6rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            Services
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {serviceTypes.length > 0 ? (
              serviceTypes.map((service) => (
                <span
                  key={service}
                  className="rounded-md border border-dashed border-border px-2 py-1 text-[0.65rem] font-medium text-muted-foreground"
                >
                  {service}
                </span>
              ))
            ) : (
              <span className="rounded-md border border-dashed border-border px-2 py-1 text-[0.65rem] font-medium text-muted-foreground">
                No services listed
              </span>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center gap-2 pt-4">
          <BookmarkToggle agent={agent} variant="icon" className="shrink-0" />
          <ComparisonToggle
            className="shrink-0 border-border bg-background text-foreground hover:border-input hover:bg-muted hover:text-foreground"
            reference={{ agentId: agent.agentId, chainId: agent.chainId }}
            goal={comparisonGoal}
            variant="icon"
          />
          {actionHref ? (
            <Link
              href={actionHref}
              prefetch={false}
              className="inline-flex h-9 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-brand bg-brand px-3 text-xs font-semibold text-brand-foreground outline-none transition-colors hover:bg-brand-hover focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              {actionLabel}
              <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
