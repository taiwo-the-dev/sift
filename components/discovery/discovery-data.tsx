import { AgentCard } from "@/components/discovery/agent-card";
import { EmptyState } from "@/components/discovery/empty-state";
import { NetworkStatus } from "@/components/discovery/network-status";
import { Pagination } from "@/components/discovery/pagination";
import { ResultToolbar } from "@/components/discovery/result-toolbar";
import type { CatalogueNetworkStatus } from "@/features/catalogue/status";
import type { DiscoveryQuery } from "@/features/discovery/model";
import { createCatalogueStatusRepository } from "@/lib/db/catalogue-status-repository";
import { createDiscoveryRepository } from "@/lib/db/discovery-repository";

interface DiscoveryDataProps {
  query: DiscoveryQuery;
}

export async function CatalogueStatusData({ query }: DiscoveryDataProps) {
  let statuses: readonly CatalogueNetworkStatus[] | null = null;

  try {
    statuses = await createCatalogueStatusRepository().list();
  } catch (error) {
    console.error(
      "Sift could not load the agent directory status.",
      error instanceof Error ? error.message : "Unknown database error.",
    );
  }

  return (
    <div className="sift-data-arrival">
      <NetworkStatus query={query} statuses={statuses} />
    </div>
  );
}

export async function DiscoveryResults({ query }: DiscoveryDataProps) {
  const result = await createDiscoveryRepository().search(query);

  return (
    <div className="sift-data-arrival">
      <ResultToolbar
        hasMoreResults={result.hasNextPage}
        query={query}
        resultCount={result.agents.length}
        totalCount={result.totalCount}
      />

      {result.agents.length > 0 ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-3">
            {result.agents.map((agent) => (
              <AgentCard
                key={agent.agentDbId}
                agent={agent}
                comparisonGoal={query.query}
              />
            ))}
          </div>
          <Pagination
            currentPage={result.page}
            hasNextPage={result.hasNextPage}
            query={query}
          />
        </>
      ) : (
        <>
          <div className="mt-6">
            <EmptyState />
          </div>
          {result.page > 1 ? (
            <Pagination
              currentPage={result.page}
              hasNextPage={false}
              query={query}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
