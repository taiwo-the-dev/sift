import {
  ArrowRight,
  Clock3,
  Gauge,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { AgentAvatar } from "@/components/discovery/agent-avatar";
import { buildAgentProfileHref } from "@/features/agents/route";
import {
  formatAgentName,
  formatChainName,
  formatRegistrationDate,
} from "@/features/discovery/format";
import type { DiscoveryAgent } from "@/features/discovery/model";
import type { FeaturedScoredAgent } from "@/features/scoring/model";
import { describeScoreConfidence } from "@/features/scoring/presentation";

const featuredSignals = [
  "Current versioned Sift Score with at least 60% evidence coverage",
  "Successful endpoint observation within the last 24 hours",
  "Ordered by score, then confidence; never by payment",
] as const;

interface AgentCollectionsSectionProps {
  catalogueAvailable: boolean;
  featuredAgents: readonly FeaturedScoredAgent[];
  recentAgents: readonly DiscoveryAgent[];
}

export function AgentCollectionsSection({
  catalogueAvailable,
  featuredAgents,
  recentAgents,
}: AgentCollectionsSectionProps) {
  return (
    <section
      id="agent-collections"
      className="scroll-mt-24 bg-background py-20 sm:py-24"
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:items-end md:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Agent discovery
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
              Featured and <span className="text-brand">recent agents.</span>
            </h2>
          </div>
          <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground md:justify-self-end sm:text-lg">
            Browse the newest identities now. Featured recommendations remain
            deliberately separate until Sift has enough real evidence to rank them.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(24rem,0.9fr)]">
          <article className="overflow-hidden rounded-2xl border border-border bg-card">
            <header className="flex items-start justify-between gap-6 p-6 sm:p-8">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
                  <ScanSearch className="size-4" aria-hidden="true" />
                  Featured collection
                </p>
                <h3 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
                  {featuredAgents.length > 0
                    ? "Evidence-qualified agents"
                    : "No agents meet the featured rule yet"}
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  Featured placement requires a current persisted Sift Score,
                  at least 60% evidence coverage, and a successful health check
                  within 24 hours. It is never paid placement.
                </p>
              </div>
              <span className="hidden size-12 shrink-0 place-items-center rounded-xl border border-border bg-background text-brand sm:grid">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
            </header>

            <div className="grid grid-cols-1 border-t border-border md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="flex min-h-56 flex-col justify-between p-6 sm:p-8">
                {featuredAgents.length > 0 ? (
                  <ol className="divide-y divide-border border-y border-border">
                    {featuredAgents.map((agent) => {
                      const name = formatAgentName(agent.name, agent.agentId);
                      const href = buildAgentProfileHref(
                        agent.chainId,
                        agent.agentId,
                      );

                      return (
                        <li key={`${agent.chainId}:${agent.agentId}`} className="py-4">
                          <Link
                            href={href ?? "/discover"}
                            prefetch={false}
                            className="group flex items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
                          >
                            <AgentAvatar
                              agentId={agent.agentId}
                              imageUrl={agent.imageUrl}
                              name={name}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground group-hover:text-brand">
                                {name}
                              </p>
                              <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Gauge className="size-3 text-brand" aria-hidden="true" />
                                {agent.score.score}/100 ·{" "}
                                {describeScoreConfidence(agent.score.confidence)}
                              </p>
                            </div>
                            <span className="text-xs font-semibold capitalize text-foreground">
                              {agent.health.status}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Featured placement unavailable
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Agents remain discoverable without being presented as
                      “best” while the current evidence threshold is unmet.
                    </p>
                  </div>
                )}
                <Link
                  href="/discover"
                  className="group mt-8 inline-flex items-center gap-2 self-start rounded-sm text-sm font-semibold text-foreground outline-none transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30"
                >
                  Browse all indexed agents
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                    aria-hidden="true"
                  />
                </Link>
              </div>

              <div className="border-t border-border bg-secondary/45 p-6 md:border-l md:border-t-0 sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Required selection signals
                </p>
                <ul className="mt-5 space-y-4">
                  {featuredSignals.map((signal, index) => (
                    <li key={signal} className="flex items-start gap-3">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-input text-[0.65rem] font-semibold text-brand">
                        {index + 1}
                      </span>
                      <span className="pt-0.5 text-sm leading-5 text-foreground">
                        {signal}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </article>

          <article className="flex flex-col rounded-2xl border border-border bg-card p-6 sm:p-8">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
              <Clock3 className="size-4" aria-hidden="true" />
              Recent collection
            </p>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                  Recently registered
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Ordered from real ERC-8004 registration events observed by the
                  Sift Indexer.
                </p>
              </div>
              {catalogueAvailable ? (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-2.5 py-1 text-[0.7rem] font-semibold text-emerald-200">
                  Live index
                </span>
              ) : null}
            </div>

            {recentAgents.length > 0 ? (
              <ol className="mt-6 divide-y divide-border border-y border-border">
                {recentAgents.map((agent) => (
                  <li key={agent.agentDbId} className="flex items-start gap-3 py-4">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-background text-xs font-semibold text-brand">
                      {formatAgentName(agent.name, agent.agentId)
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {formatAgentName(agent.name, agent.agentId)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatRegistrationDate(agent.registeredAt)} ·{" "}
                        {formatChainName(agent.chainId)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-6 rounded-lg border border-dashed border-input bg-background p-5">
                <p className="text-sm font-semibold text-foreground">
                  {catalogueAvailable
                    ? "No indexed registrations yet"
                    : "Catalogue temporarily unavailable"}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {catalogueAvailable
                    ? "This collection will populate after the indexer records a registration."
                    : "Sift is not substituting placeholder records while the database cannot be reached."}
                </p>
              </div>
            )}

            <Link
              href="/discover?sort=recent"
              className="group mt-auto inline-flex items-center gap-2 self-start rounded-sm pt-7 text-sm font-semibold text-foreground outline-none transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              View recent agents
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none"
                aria-hidden="true"
              />
            </Link>
          </article>
        </div>
      </div>
    </section>
  );
}
