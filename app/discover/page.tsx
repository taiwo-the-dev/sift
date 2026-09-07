import type { Metadata } from "next";
import { Suspense } from "react";

import { ActiveFilters } from "@/components/discovery/active-filters";
import {
  CatalogueStatusData,
  DiscoveryResults,
} from "@/components/discovery/discovery-data";
import {
  DiscoveryResultsLoading,
  NetworkStatusLoading,
} from "@/components/discovery/discovery-loading";
import { DiscoverySearchForm } from "@/components/discovery/discovery-search-form";
import { FilterPanel } from "@/components/discovery/filter-panel";
import {
  parseDiscoverySearchParams,
  type DiscoverySearchParams,
} from "@/features/discovery/query";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Discover AI agents",
  description:
    "Search ERC-8004 agents by capability, service, and activity on BNB Chain.",
  path: "/discover",
});

interface DiscoverPageProps {
  searchParams: Promise<DiscoverySearchParams>;
}

export default async function DiscoverPage({ searchParams }: DiscoverPageProps) {
  const query = parseDiscoverySearchParams(await searchParams);

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
                ERC-8004 agents on BNB Chain
              </p>
              <h1 className="mt-4 max-w-2xl text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
                Find the right agent for your task.
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-base leading-7 text-muted-foreground">
                Search BNB Chain agents by service, capability, and latest health
                check.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-background/90 p-4 shadow-2xl shadow-black/10 sm:p-5">
              <DiscoverySearchForm query={query} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <Suspense fallback={<NetworkStatusLoading />}>
          <CatalogueStatusData query={query} />
        </Suspense>
        <ActiveFilters query={query} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[18.5rem_minmax(0,1fr)] lg:gap-8">
          <FilterPanel query={query} />

          <div className="min-w-0">
            <Suspense fallback={<DiscoveryResultsLoading />}>
              <DiscoveryResults query={query} />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  );
}
