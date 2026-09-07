import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CircleAlert,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";

import { BookmarkToggle } from "@/components/bookmarks/bookmark-toggle";
import { AgentAvatar } from "@/components/discovery/agent-avatar";
import { AgentCarousel } from "@/components/landing/agent-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { buildAgentProfileHref } from "@/features/agents/route";
import { shouldShowOtherCategory } from "@/features/categories/presentation";
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
import { cn } from "@/lib/utils";

interface AgentCollectionsSectionProps {
  catalogueAvailable: boolean;
  catalogueCount: number | null;
  recentAgents: readonly DiscoveryAgent[];
}

const countFormatter = new Intl.NumberFormat("en");

const artworkStyles = [
  "bg-[radial-gradient(circle_at_18%_18%,rgba(240,185,11,0.22),transparent_11rem),linear-gradient(145deg,#20242b,#12151a)]",
  "bg-[radial-gradient(circle_at_82%_12%,rgba(240,185,11,0.18),transparent_10rem),linear-gradient(155deg,#171b20,#20242b)]",
  "bg-[radial-gradient(circle_at_50%_-15%,rgba(240,185,11,0.24),transparent_12rem),linear-gradient(145deg,#1d2127,#111419)]",
  "bg-[radial-gradient(circle_at_15%_85%,rgba(240,185,11,0.17),transparent_11rem),linear-gradient(155deg,#20242b,#12151a)]",
] as const;

const metadataStatusStyles = {
  invalid: "border-amber-400/20 bg-amber-400/8 text-amber-200",
  pending: "border-sky-400/20 bg-sky-400/8 text-sky-200",
  unavailable: "border-border bg-secondary text-muted-foreground",
  valid: "border-emerald-400/20 bg-emerald-400/8 text-emerald-200",
} as const;

function RecentAgentCard({
  agent,
  position,
}: Readonly<{ agent: DiscoveryAgent; position: number }>) {
  const name = formatAgentName(agent.name, agent.agentId);
  const href =
    buildAgentProfileHref(agent.chainId, agent.agentId) ?? "/discover";
  const category = agent.categories[0];
  const showOtherCategory = shouldShowOtherCategory(
    agent.metadataStatus,
    agent.categories,
  );
  const services = [
    ...new Set(
      agent.services.map((service) =>
        formatServiceType(service.serviceType),
      ),
    ),
  ].slice(0, 2);

  return (
    <article className="sift-card-reveal group flex h-full min-h-[25rem] flex-col overflow-hidden rounded-2xl border border-border bg-background transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-brand/35 hover:shadow-[0_22px_48px_rgba(0,0,0,0.28)] motion-reduce:transform-none">
      <div
        className={cn(
          "relative overflow-hidden border-b border-white/6 p-5",
          artworkStyles[position % artworkStyles.length],
        )}
      >
        <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(234,236,239,0.24)_0.7px,transparent_0.7px)] [background-size:11px_11px]" />
        <div
          className="absolute -right-12 top-1/2 size-44 -translate-y-1/2 rounded-full border border-brand/10"
          aria-hidden="true"
        />
        <div
          className="absolute -right-4 top-1/2 size-28 -translate-y-1/2 rounded-full border border-brand/10"
          aria-hidden="true"
        />

        <div className="relative flex items-center justify-between gap-3">
          <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[0.62rem] font-semibold text-white/75 backdrop-blur-sm">
            {formatChainName(agent.chainId)}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[0.62rem] font-semibold backdrop-blur-sm",
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

        <div className="relative mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
          <div className="rounded-full bg-black/20 p-1 ring-1 ring-white/10 shadow-[0_14px_30px_rgba(0,0,0,0.28)]">
            <AgentAvatar
              agentId={agent.agentId}
              imageUrl={agent.imageUrl}
              name={name}
            />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-white/50">
              ERC-8004 · #{agent.agentId}
            </p>
            <h3 className="mt-1.5 line-clamp-2 text-xl font-semibold leading-6 tracking-[-0.03em] text-white">
              <Link
                href={href}
                prefetch={false}
                className="rounded-sm outline-none transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {name}
              </Link>
            </h3>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            About
          </p>
          <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {formatAgentDescription(agent.description)}
          </p>
        </div>

        <div className="mt-4">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Capabilities
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {category ? (
              <span className="rounded-md border border-dashed border-brand/35 px-2 py-1 text-[0.65rem] font-semibold text-brand">
                {formatCategory(category)}
              </span>
            ) : showOtherCategory ? (
              <span className="rounded-md border border-dashed border-border px-2 py-1 text-[0.65rem] font-semibold text-muted-foreground">
                Other
              </span>
            ) : null}
            {services.map((service) => (
              <span
                key={service}
                className="rounded-md border border-dashed border-border px-2 py-1 text-[0.65rem] font-medium text-muted-foreground"
              >
                {service}
              </span>
            ))}
            {!category && !showOtherCategory && services.length === 0 ? (
              <span className="rounded-md border border-dashed border-border px-2 py-1 text-[0.65rem] font-medium text-muted-foreground">
                No capabilities listed
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
              Registered
            </p>
            <span className="mt-1 inline-flex items-center gap-1.5 text-[0.68rem] text-muted-foreground">
              <CalendarDays className="size-3 text-brand" aria-hidden="true" />
              {formatRegistrationDate(agent.registeredAt)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <BookmarkToggle agent={agent} variant="icon" />
            <Link
              href={href}
              prefetch={false}
              aria-label={`Open ${name}`}
              className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-foreground outline-none transition-colors hover:border-brand/35 hover:bg-brand hover:text-brand-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function AgentCollectionsSection({
  catalogueAvailable,
  catalogueCount,
  recentAgents,
}: AgentCollectionsSectionProps) {
  const catalogueLabel =
    catalogueCount === null
      ? "Live agent directory"
      : `${countFormatter.format(catalogueCount)} agents`;

  return (
    <section
      id="agent-collections"
      className="sift-data-arrival scroll-mt-24 border-b border-border bg-card/45 py-16 sm:py-20"
    >
      <div className="sift-scroll-reveal mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              Latest registrations
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              Newly registered AI agents.
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              The latest ERC-8004 agents registered on BNB Chain.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-muted-foreground">
              {catalogueLabel}
            </span>
            <Link
              href="/discover"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-colors hover:bg-brand"
            >
              Browse all
              <ArrowRight
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>

        {recentAgents.length > 0 ? (
          <AgentCarousel live={catalogueAvailable}>
            {recentAgents.map((agent, index) => (
              <div
                key={agent.agentDbId}
                className="w-[86%] shrink-0 snap-start sm:w-[20rem] lg:w-[22rem] xl:w-[calc((100%-3rem)/4)]"
              >
                <RecentAgentCard agent={agent} position={index} />
              </div>
            ))}
          </AgentCarousel>
        ) : (
          <div className="mt-9 rounded-2xl border border-dashed border-input bg-background p-8 text-center sm:p-12">
            <p className="text-base font-semibold text-foreground">
              {catalogueAvailable
                ? "No agents available yet"
                : "The agent directory is temporarily unavailable"}
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {catalogueAvailable
                ? "Check again after the next indexer sync."
                : "Try again shortly."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export function AgentCollectionsLoading() {
  return (
    <section
      id="agent-collections"
      aria-busy="true"
      aria-label="Loading latest agents"
      className="scroll-mt-24 border-b border-border bg-card/45 py-16 sm:py-20"
    >
      <div className="sift-scroll-reveal mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              Latest registrations
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              Newly registered AI agents.
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              The latest ERC-8004 agents registered on BNB Chain.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Link
              href="/discover"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-colors hover:bg-brand"
            >
              Browse all
              <ArrowRight
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>

        <div className="mt-9 flex items-center gap-3 border-b border-border pb-3">
          <p className="text-sm font-semibold text-foreground">Latest registrations</p>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand">
            <LoaderCircle
              className="size-3.5 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            Loading agents…
          </span>
        </div>
        <div className="-mx-4 mt-5 flex gap-4 overflow-hidden px-4 pb-4 sm:mx-0 sm:px-0">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton
              key={index}
              className="h-[25rem] w-[86%] shrink-0 rounded-2xl border border-border sm:w-[20rem] lg:w-[22rem] xl:w-[calc((100%-3rem)/4)]"
            />
          ))}
        </div>
        <span className="sr-only">Loading the latest registered agents…</span>
      </div>
    </section>
  );
}
