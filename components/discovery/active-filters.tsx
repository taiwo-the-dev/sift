import { X } from "lucide-react";
import Link from "next/link";

import {
  formatCategory,
  formatHealthStatus,
  formatMetadataStatus,
} from "@/features/discovery/format";
import type { DiscoveryQuery } from "@/features/discovery/model";
import {
  buildDiscoveryHref,
  isReadyAvailabilityQuery,
} from "@/features/discovery/query";

interface ActiveFiltersProps {
  query: DiscoveryQuery;
}

export function ActiveFilters({ query }: ActiveFiltersProps) {
  const hiringAvailabilitySelected = isReadyAvailabilityQuery(query);
  const visibleMetadataStatuses = query.metadataStatuses;
  const hasFilters =
    query.query.length > 0 ||
    query.categories.length > 0 ||
    query.healthStatuses.length > 0 ||
    query.metadataStatuses.length > 0 ||
    query.network !== "bsc-mainnet" ||
    hiringAvailabilitySelected;

  if (!hasFilters) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      <span className="mr-1 text-xs font-medium text-muted-foreground">Active</span>
      {query.network !== "bsc-mainnet" ? (
        <Link
          href={buildDiscoveryHref(query, {
            network: "bsc-mainnet",
            page: 1,
          })}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/8 px-3 py-1.5 text-xs font-medium text-brand outline-none hover:border-brand/60 focus-visible:ring-3 focus-visible:ring-ring/30"
          aria-label="Show BSC Mainnet agents"
        >
          {query.network === "all" ? "All networks" : "BSC Testnet"}
          <X className="size-3" aria-hidden="true" />
        </Link>
      ) : null}
      {hiringAvailabilitySelected ? (
        <Link
          href={buildDiscoveryHref(query, {
            page: 1,
            taskAvailability: null,
          })}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/8 px-3 py-1.5 text-xs font-medium text-brand outline-none hover:border-brand/60 focus-visible:ring-3 focus-visible:ring-ring/30"
          aria-label="Remove Available filter"
        >
          Available
          <X className="size-3" aria-hidden="true" />
        </Link>
      ) : null}
      {query.query ? (
        <Link
          href={buildDiscoveryHref(query, {
            page: 1,
            query: "",
            sort: "recent",
          })}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-input bg-secondary px-3 py-1.5 text-xs font-medium text-foreground outline-none hover:border-brand/60 focus-visible:ring-3 focus-visible:ring-ring/30"
          aria-label={`Remove search ${query.query}`}
        >
          <span className="max-w-52 truncate">
            “{query.query}”
          </span>
          <X className="size-3" aria-hidden="true" />
        </Link>
      ) : null}

      {query.categories.map((category) => (
        <Link
          key={category}
          href={buildDiscoveryHref(query, {
            categories: query.categories.filter((value) => value !== category),
            page: 1,
          })}
          className="inline-flex items-center gap-1.5 rounded-full border border-input bg-secondary px-3 py-1.5 text-xs font-medium text-foreground outline-none hover:border-brand/60 focus-visible:ring-3 focus-visible:ring-ring/30"
          aria-label={`Remove ${formatCategory(category)} filter`}
        >
          {formatCategory(category)}
          <X className="size-3" aria-hidden="true" />
        </Link>
      ))}

      {visibleMetadataStatuses.map((status) => (
        <Link
          key={status}
          href={buildDiscoveryHref(query, {
            metadataStatuses: query.metadataStatuses.filter(
              (value) => value !== status,
            ),
            page: 1,
          })}
          className="inline-flex items-center gap-1.5 rounded-full border border-input bg-secondary px-3 py-1.5 text-xs font-medium text-foreground outline-none hover:border-brand/60 focus-visible:ring-3 focus-visible:ring-ring/30"
          aria-label={`Remove ${formatMetadataStatus(status)} filter`}
        >
          {formatMetadataStatus(status)}
          <X className="size-3" aria-hidden="true" />
        </Link>
      ))}

      {query.healthStatuses.map((status) => (
        <Link
          key={status}
          href={buildDiscoveryHref(query, {
            healthStatuses: query.healthStatuses.filter(
              (value) => value !== status,
            ),
            page: 1,
          })}
          className="inline-flex items-center gap-1.5 rounded-full border border-input bg-secondary px-3 py-1.5 text-xs font-medium text-foreground outline-none hover:border-brand/60 focus-visible:ring-3 focus-visible:ring-ring/30"
          aria-label={`Remove ${formatHealthStatus(status)} filter`}
        >
          {formatHealthStatus(status)}
          <X className="size-3" aria-hidden="true" />
        </Link>
      ))}

      <Link
        href="/discover"
        className="rounded-sm px-1 py-1 text-xs font-semibold text-brand outline-none hover:text-brand-hover focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        Clear all
      </Link>
    </div>
  );
}
