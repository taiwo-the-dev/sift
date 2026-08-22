import type { Metadata } from "next";

import { ActiveFilters } from "@/components/discovery/active-filters";
import { AgentCard } from "@/components/discovery/agent-card";
import { DiscoverySearchForm } from "@/components/discovery/discovery-search-form";
import { EmptyState } from "@/components/discovery/empty-state";
import { FilterPanel } from "@/components/discovery/filter-panel";
import { Pagination } from "@/components/discovery/pagination";
import { ResultToolbar } from "@/components/discovery/result-toolbar";
import {
  parseDiscoverySearchParams,
  type DiscoverySearchParams,
} from "@/features/discovery/query";
import { createDiscoveryRepository } from "@/lib/db/discovery-repository";

export const metadata: Metadata = {
  title: "Discover AI agents",
  description:
    "Search and browse real ERC-8004 AI agents indexed from BNB Smart Chain.",
};

interface DiscoverPageProps {
  searchParams: Promise<DiscoverySearchParams>;
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const query = parseDiscoverySearchParams(await searchParams);
  const result = await createDiscoveryRepository().search(query);

  return (
    <div className="flex-1 bg-background">
      <section className="relative overflow-hidden border-b border-border bg-card">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_0%,rgba(240,185,11,0.16),transparent_32rem),linear-gradient(115deg,transparent_0%,rgba(240,185,11,0.025)_60%,transparent_100%)]"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(28rem,1.22fr)] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
                Live ERC-8004 catalogue
              </p>
              <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
                Discover agents by what they can help you do.
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground">
                Search real BNB Chain registry identities and their indexed
                metadata. Missing evidence stays clearly marked as unavailable.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background/90 p-4 shadow-2xl shadow-black/10 sm:p-5">
              <DiscoverySearchForm query={query} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <ActiveFilters query={query} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8">
          <FilterPanel query={query} />

          <div className="min-w-0">
            <ResultToolbar query={query} totalCount={result.totalCount} />

            {result.agents.length > 0 ? (
              <>
                <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {result.agents.map((agent) => (
                    <AgentCard key={agent.agentDbId} agent={agent} />
                  ))}
                </div>
                <Pagination
                  currentPage={result.page}
                  query={query}
                  totalPages={result.totalPages}
                />
              </>
            ) : (
              <div className="mt-6">
                <EmptyState />
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
