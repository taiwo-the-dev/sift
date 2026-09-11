import { ArrowUpRight, CalendarDays } from "lucide-react";
import Link from "next/link";

import { AgentArtworkHeader } from "@/components/agents/agent-artwork-header";
import {
  AgentCardContext,
  AgentVerificationStatus,
} from "@/components/agents/agent-card-context";
import { BookmarkToggle } from "@/components/bookmarks/bookmark-toggle";
import { AgentAvatar } from "@/components/discovery/agent-avatar";
import { buildAgentProfileHref } from "@/features/agents/route";
import type { BookmarkableAgent } from "@/features/bookmarks/model";
import {
  formatAgentDescription,
  formatAgentName,
  formatServiceType,
} from "@/features/discovery/format";
import type { DiscoveryService } from "@/features/discovery/model";

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
  const services = [
    ...new Set(
      (agent.services ?? []).map((service) =>
        formatServiceType(service.serviceType),
      ),
    ),
  ].slice(0, 2);

  return (
    <article className="sift-card-reveal group flex h-full min-h-[25rem] flex-col overflow-hidden rounded-2xl border border-border bg-background transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-brand/35 hover:shadow-[0_22px_48px_rgba(0,0,0,0.28)] motion-reduce:transform-none">
      <AgentArtworkHeader position={position}>
        <AgentCardContext category={category} chainId={agent.chainId} />

        <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
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
            <AgentVerificationStatus status={agent.metadataStatus} />
          </div>
        </div>
      </AgentArtworkHeader>

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
            Services
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {services.length > 0 ? (
              services.map((service) => (
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
