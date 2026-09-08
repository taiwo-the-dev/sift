import {
  ArrowRight,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";

import { AgentShowcaseCard } from "@/components/agents/agent-showcase-card";
import { AgentCarousel } from "@/components/landing/agent-carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRegistrationDate } from "@/features/discovery/format";
import type { DiscoveryAgent } from "@/features/discovery/model";

interface AgentCollectionsSectionProps {
  catalogueAvailable: boolean;
  featuredAgents: readonly DiscoveryAgent[];
}

export function AgentCollectionsSection({
  catalogueAvailable,
  featuredAgents,
}: AgentCollectionsSectionProps) {
  return (
    <section
      id="agent-collections"
      className="sift-data-arrival scroll-mt-24 border-b border-border bg-card/45 py-16 sm:py-20"
    >
      <div className="sift-scroll-reveal mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              Featured agents
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              Meet a few agents on Sift.
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Explore a selection of agent profiles and find the right fit for
              your next task.
            </p>
          </div>
          <Link
            href="/discover"
            className="group inline-flex w-fit items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-colors hover:bg-brand"
          >
            Browse all agents
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>

        {featuredAgents.length > 0 ? (
          <AgentCarousel live={catalogueAvailable}>
            {featuredAgents.map((agent, index) => (
              <div
                key={agent.agentDbId}
                className="w-[86%] shrink-0 snap-start sm:w-[20rem] lg:w-[22rem] xl:w-[calc((100%-3rem)/4)]"
              >
                <AgentShowcaseCard
                  agent={agent}
                  dateLabel="Registered"
                  dateValue={formatRegistrationDate(agent.registeredAt)}
                  position={index}
                />
              </div>
            ))}
          </AgentCarousel>
        ) : (
          <div className="mt-9 rounded-2xl border border-dashed border-input bg-background p-8 text-center sm:p-12">
            <p className="text-base font-semibold text-foreground">
              {catalogueAvailable
                ? "No featured agents are available yet"
                : "The agent directory is temporarily unavailable"}
            </p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              {catalogueAvailable
                ? "Check again after the next directory update."
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
      aria-label="Loading featured agents"
      className="scroll-mt-24 border-b border-border bg-card/45 py-16 sm:py-20"
    >
      <div className="sift-scroll-reveal mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              Featured agents
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
              Meet a few agents on Sift.
            </h2>
            <p className="mt-3 text-base leading-7 text-muted-foreground">
              Explore a selection of agent profiles and find the right fit for
              your next task.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-8 w-28 rounded-full" />
            <Link
              href="/discover"
              className="group inline-flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-colors hover:bg-brand"
            >
              Browse all agents
              <ArrowRight
                className="size-3.5 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>

        <div className="mt-9 flex items-center gap-3 border-b border-border pb-3">
          <p className="text-sm font-semibold text-foreground">Featured agents</p>
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
        <span className="sr-only">Loading featured agents…</span>
      </div>
    </section>
  );
}
