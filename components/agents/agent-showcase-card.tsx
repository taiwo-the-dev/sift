import {
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  CircleAlert,
} from "lucide-react";
import Link from "next/link";

import { BookmarkToggle } from "@/components/bookmarks/bookmark-toggle";
import { AgentAvatar } from "@/components/discovery/agent-avatar";
import { buildAgentProfileHref } from "@/features/agents/route";
import type { BookmarkableAgent } from "@/features/bookmarks/model";
import { shouldShowOtherCategory } from "@/features/categories/presentation";
import {
  formatAgentDescription,
  formatAgentName,
  formatCategory,
  formatChainName,
  formatMetadataStatus,
  formatServiceType,
} from "@/features/discovery/format";
import type { DiscoveryService } from "@/features/discovery/model";
import { cn } from "@/lib/utils";

type ShowcaseAgent = BookmarkableAgent &
  Readonly<{
    services?: readonly Pick<DiscoveryService, "serviceType">[];
  }>;

interface AgentShowcaseCardProps {
  agent: ShowcaseAgent;
  dateLabel: string;
  dateValue: string;
  position: number;
}

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

export function AgentShowcaseCard({
  agent,
  dateLabel,
  dateValue,
  position,
}: AgentShowcaseCardProps) {
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
      (agent.services ?? []).map((service) =>
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
          <div className="rounded-full bg-black/20 p-1 shadow-[0_14px_30px_rgba(0,0,0,0.28)] ring-1 ring-white/10">
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
            <h3 className="mt-1.5 line-clamp-2 text-xl leading-6 font-semibold tracking-[-0.03em] text-white">
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
              {dateLabel}
            </p>
            <span className="mt-1 inline-flex items-center gap-1.5 text-[0.68rem] text-muted-foreground">
              <CalendarDays className="size-3 text-brand" aria-hidden="true" />
              {dateValue}
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
