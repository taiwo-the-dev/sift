import {
  BadgeCheck,
  BriefcaseBusiness,
  CircleAlert,
  Clock3,
  ExternalLink,
  Gauge,
  RadioTower,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { BookmarkToggle } from "@/components/bookmarks/bookmark-toggle";
import { ComparisonToggle } from "@/components/comparison/comparison-toggle";
import { AgentAvatar } from "@/components/discovery/agent-avatar";
import { buttonVariants } from "@/components/ui/button";
import { formatProfileTimestamp } from "@/features/agents/format";
import { buildExplorerAddressHref } from "@/features/agents/links";
import type { AgentProfile } from "@/features/agents/model";
import {
  describeProfileProvenance,
  hasHumanReadableMetadata,
} from "@/features/agents/presentation";
import { shouldShowOtherCategory } from "@/features/categories/presentation";
import {
  formatAgentName,
  formatCategory,
  formatChainName,
  formatMetadataStatus,
} from "@/features/discovery/format";
import { assessHiringCompatibility } from "@/features/hiring/compatibility";
import { describeScoreConfidence } from "@/features/scoring/presentation";
import { cn } from "@/lib/utils";
import { currentActivationServices } from "@/features/activation/service";

interface ProfileHeaderProps {
  comparisonGoal?: string;
  profile: AgentProfile;
}

interface EvidenceStatProps {
  detail: string;
  icon: ReactNode;
  label: string;
  value: string;
}

const provenanceToneStyles = {
  caution: "border-amber-400/25 bg-amber-400/8 text-amber-100",
  good: "border-emerald-400/25 bg-emerald-400/8 text-emerald-100",
  neutral: "border-sky-400/25 bg-sky-400/8 text-sky-100",
} as const;

function EvidenceStat({ detail, icon, label, value }: EvidenceStatProps) {
  return (
    <div className="min-w-0 bg-card p-4 sm:p-5">
      <dt className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-3 truncate text-sm font-semibold capitalize text-foreground">
        {value}
      </dd>
      <p className="mt-1 truncate text-xs text-muted-foreground" title={detail}>
        {detail}
      </p>
    </div>
  );
}

export function ProfileHeader({
  comparisonGoal = "",
  profile,
}: ProfileHeaderProps) {
  const name = formatAgentName(profile.name, profile.agentId);
  const provenance = describeProfileProvenance(
    profile.metadataStatus,
    hasHumanReadableMetadata(profile),
    profile.metadataVerifiedAt,
  );
  const registryHref = buildExplorerAddressHref(
    profile.chainId,
    profile.registryAddress,
  );
  const scoreValue = !profile.score
    ? "Not available"
    : profile.score.score === null
      ? "Not enough data"
      : `${profile.score.score}/100`;
  const scoreDetail = !profile.score
    ? "Waiting for enough verified evidence"
    : profile.score.score === null
      ? `${describeScoreConfidence(profile.score.confidence)} · insufficient evidence`
      : describeScoreConfidence(profile.score.confidence);
  const healthValue = profile.health
    ? profile.health.status
    : "Not checked";
  const healthDetail = profile.health
    ? `Checked ${formatProfileTimestamp(profile.health.lastCheckedAt)}`
    : "No health check available";
  const hiring = assessHiringCompatibility(profile);
  const hireable = hiring.compatibility !== null;
  const taskServices = currentActivationServices(profile.services);
  const taskReady =
    profile.metadataStatus === "valid" &&
    profile.active !== false &&
    taskServices.length > 0;
  const showOtherCategory = shouldShowOtherCategory(
    profile.metadataStatus,
    profile.categories,
  );

  return (
    <header className="relative overflow-hidden border-b border-border bg-card">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_75%_-20%,rgba(240,185,11,0.18),transparent_34rem),linear-gradient(115deg,transparent_0%,rgba(240,185,11,0.025)_65%,transparent_100%)]"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <ol className="flex items-center gap-2">
            <li>
              <Link
                href="/discover"
                className="rounded-sm outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                Discover
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">
              Agent #{profile.agentId}
            </li>
          </ol>
        </nav>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start">
            <AgentAvatar
              agentId={profile.agentId}
              imageUrl={profile.imageUrl}
              name={name}
              size="profile"
            />

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-brand">
                  {formatChainName(profile.chainId)}
                </span>
                <span className="rounded-full border border-border bg-background/60 px-2.5 py-1 text-[0.68rem] font-semibold text-muted-foreground">
                  ERC-8004 #{profile.agentId}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold",
                    profile.active === true
                      ? "border-emerald-400/25 bg-emerald-400/8 text-emerald-200"
                      : "border-border bg-background/60 text-muted-foreground",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1.5 rounded-full",
                      profile.active === true
                        ? "bg-emerald-300"
                        : "bg-muted-foreground",
                    )}
                  />
                  {profile.active === null
                    ? "Status not listed"
                    : profile.active
                      ? "Listed as active"
                      : "Listed as inactive"}
                </span>
              </div>

              <h1 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                {name}
              </h1>
              {profile.categories.length > 0 || showOtherCategory ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {profile.categories.map((category) => (
                    <span
                      key={category}
                      className="rounded-md border border-border bg-background/50 px-2.5 py-1 text-xs font-medium text-foreground"
                    >
                      {formatCategory(category)}
                    </span>
                  ))}
                  {showOtherCategory ? (
                    <span
                      className="rounded-md border border-border bg-background/50 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                      title="This valid profile does not match one of Sift's four supported marketplace categories."
                    >
                      Other
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
            <BookmarkToggle agent={profile} />
            {taskReady ? (
              <Link
                href={`/start/${profile.chainId}/${profile.agentId}`}
                className={cn(buttonVariants({ variant: "brand" }), "gap-2")}
              >
                <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
                Start task
              </Link>
            ) : null}
            <ComparisonToggle
              goal={comparisonGoal}
              reference={{
                agentId: profile.agentId,
                chainId: profile.chainId,
              }}
            />
            {registryHref ? (
              <a
                href={registryHref}
                target="_blank"
                rel="noreferrer noopener"
                className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
              >
                BscScan
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </div>

        <dl className="mt-7 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          <EvidenceStat
            icon={
              profile.metadataStatus === "valid" ? (
                <BadgeCheck className="size-4 text-emerald-300" aria-hidden="true" />
              ) : (
                <CircleAlert className="size-4 text-amber-300" aria-hidden="true" />
              )
            }
            label="Profile"
            value={formatMetadataStatus(profile.metadataStatus)}
            detail={`Verified ${formatProfileTimestamp(profile.metadataVerifiedAt)}`}
          />
          <EvidenceStat
            icon={<Gauge className="size-4 text-brand" aria-hidden="true" />}
            label="Sift Score"
            value={scoreValue}
            detail={scoreDetail}
          />
          <EvidenceStat
            icon={<RadioTower className="size-4 text-sky-300" aria-hidden="true" />}
            label="Health"
            value={healthValue}
            detail={healthDetail}
          />
          <EvidenceStat
            icon={<BriefcaseBusiness className="size-4 text-violet-300" aria-hidden="true" />}
            label="Task access"
            value={taskReady ? "Available" : "Unavailable"}
            detail={
              taskReady
                ? `${taskServices.length} recently checked ${taskServices.length === 1 ? "method" : "methods"}`
                : "No supported service has a current successful check"
            }
          />
        </dl>

        <div
          className={cn(
            "mt-4 flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center",
            provenanceToneStyles[provenance.tone],
          )}
        >
          <Clock3 className="size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">{provenance.label}</p>
            <p className="mt-0.5 text-xs leading-5 opacity-75">
              {provenance.description}
            </p>
          </div>
          <p className="shrink-0 text-xs opacity-75">
            Updated {formatProfileTimestamp(profile.lastSyncedAt)}
          </p>
        </div>

        <div
          id="hiring-availability"
          className="mt-4 scroll-mt-24 rounded-xl border border-border bg-background/55 px-4 py-3 text-xs leading-5 text-muted-foreground"
        >
          <span className="font-semibold text-foreground">Hiring availability: </span>
          {hireable
            ? `This profile lists supported hiring on ${formatChainName(profile.chainId)}. Sift will check the live service and signed price before you can pay.`
            : hiring.explanation}
        </div>
      </div>
    </header>
  );
}
