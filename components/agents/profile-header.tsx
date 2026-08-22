import {
  BadgeCheck,
  Blocks,
  CalendarDays,
  CircleAlert,
  Clock3,
  Database,
  ExternalLink,
  Gauge,
  RadioTower,
} from "lucide-react";
import Link from "next/link";

import { AgentAvatar } from "@/components/discovery/agent-avatar";
import { formatProfileTimestamp } from "@/features/agents/format";
import { buildExplorerAddressHref } from "@/features/agents/links";
import type { AgentProfile } from "@/features/agents/model";
import {
  describeProfileProvenance,
  hasHumanReadableMetadata,
} from "@/features/agents/presentation";
import {
  formatAgentDescription,
  formatAgentName,
  formatCategory,
  formatChainName,
  formatMetadataStatus,
} from "@/features/discovery/format";
import { describeScoreConfidence } from "@/features/scoring/presentation";
import { cn } from "@/lib/utils";

interface ProfileHeaderProps {
  profile: AgentProfile;
}

const provenanceToneStyles = {
  caution: "border-amber-400/25 bg-amber-400/8 text-amber-100",
  good: "border-emerald-400/25 bg-emerald-400/8 text-emerald-100",
  neutral: "border-sky-400/25 bg-sky-400/8 text-sky-100",
} as const;

export function ProfileHeader({ profile }: ProfileHeaderProps) {
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

  return (
    <header className="relative overflow-hidden border-b border-border bg-card">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,rgba(240,185,11,0.16),transparent_28rem),linear-gradient(115deg,transparent_0%,rgba(240,185,11,0.025)_65%,transparent_100%)]"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <nav aria-label="Breadcrumb">
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

          {registryHref ? (
            <a
              href={registryHref}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-md outline-none hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              View registry on BscScan
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)] lg:items-end lg:gap-12">
          <div className="flex min-w-0 flex-col gap-6 sm:flex-row sm:items-start">
            <AgentAvatar
              agentId={profile.agentId}
              imageUrl={profile.imageUrl}
              name={name}
              size="profile"
            />

            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                {profile.categories.map((category) => (
                  <span
                    key={category}
                    title={
                      profile.categorySource === "deterministic-keyword"
                        ? "Deterministically matched from indexed metadata keywords"
                        : "Category supplied by indexed metadata"
                    }
                    className="rounded-full border border-brand/20 bg-brand/8 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-brand"
                  >
                    {formatCategory(category)}
                  </span>
                ))}
                {profile.categories.length === 0 ? (
                  <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-[0.7rem] font-semibold text-muted-foreground">
                    Category not available
                  </span>
                ) : null}
              </div>

              <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
                {name}
              </h1>
              <p className="mt-4 max-w-3xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                {formatAgentDescription(profile.description)}
              </p>
            </div>
          </div>

          <div className="border-l border-border pl-5 sm:pl-6">
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Evidence snapshot
            </p>
            <dl className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                  <Blocks className="size-4 text-brand" aria-hidden="true" />
                  Identity
                </dt>
                <dd className="font-medium text-foreground">ERC-8004</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                  {profile.metadataStatus === "valid" ? (
                    <BadgeCheck
                      className="size-4 text-emerald-300"
                      aria-hidden="true"
                    />
                  ) : (
                    <CircleAlert
                      className="size-4 text-amber-300"
                      aria-hidden="true"
                    />
                  )}
                  Metadata
                </dt>
                <dd className="font-medium text-foreground">
                  {formatMetadataStatus(profile.metadataStatus)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                  <Database className="size-4 text-brand" aria-hidden="true" />
                  Network
                </dt>
                <dd className="font-medium text-foreground">
                  {formatChainName(profile.chainId)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                  <Gauge className="size-4 text-brand" aria-hidden="true" />
                  Sift Score
                </dt>
                <dd className="text-right font-medium text-foreground">
                  {profile.score?.score === null || !profile.score
                    ? "Not enough evidence"
                    : `${profile.score.score}/100 · ${describeScoreConfidence(
                        profile.score.confidence,
                      )}`}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                  <RadioTower className="size-4 text-brand" aria-hidden="true" />
                  Reachability
                </dt>
                <dd className="font-medium capitalize text-foreground">
                  {profile.health?.status ?? "Unknown"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="inline-flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="size-4 text-brand" aria-hidden="true" />
                  Registered
                </dt>
                <dd className="text-right font-medium text-foreground">
                  {formatProfileTimestamp(profile.registeredAt)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        <div
          className={cn(
            "mt-8 grid gap-3 rounded-xl border px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:px-5",
            provenanceToneStyles[provenance.tone],
          )}
        >
          <Clock3 className="size-5" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold">{provenance.label}</p>
            <p className="mt-1 text-xs leading-5 opacity-75">
              {provenance.description}
            </p>
          </div>
          <div className="text-xs opacity-75 sm:text-right">
            <p>
              Last verified: {formatProfileTimestamp(profile.metadataVerifiedAt)}
            </p>
            <p className="mt-1">
              Last indexed: {formatProfileTimestamp(profile.lastSyncedAt)}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
