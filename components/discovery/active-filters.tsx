import { X } from "lucide-react";

import { DiscoveryNavigationLink } from "@/components/discovery/discovery-navigation";
import {
  formatCategory,
  formatHealthStatus,
  formatMetadataStatus,
} from "@/features/discovery/format";
import {
  discoveryRegistrationPeriods,
  discoveryScoreBands,
  type DiscoveryQuery,
} from "@/features/discovery/model";
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
    query.scoreBands.length > 0 ||
    query.registrationPeriod !== null ||
    query.network !== "bsc-mainnet" ||
    hiringAvailabilitySelected;

  if (!hasFilters) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      <span className="mr-1 text-xs font-medium text-muted-foreground">Active</span>
      {query.network === "bsc-testnet" ? (
        <DiscoveryNavigationLink
          href={buildDiscoveryHref(query, {
            network: "bsc-mainnet",
            page: 1,
          })}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/8 px-3 py-1.5 text-xs font-medium text-brand outline-none hover:border-brand/60 focus-visible:ring-3 focus-visible:ring-ring/30"
          aria-label="Show BSC Mainnet agents"
        >
          BSC Testnet
          <X className="size-3" aria-hidden="true" />
        </DiscoveryNavigationLink>
      ) : null}
      {hiringAvailabilitySelected ? (
        <DiscoveryNavigationLink
          href={buildDiscoveryHref(query, {
            page: 1,
            taskAvailability: null,
          })}
          className="inline-flex items-center gap-1.5 rounded-full border border-brand/30 bg-brand/8 px-3 py-1.5 text-xs font-medium text-brand outline-none hover:border-brand/60 focus-visible:ring-3 focus-visible:ring-ring/30"
          aria-label="Remove Available filter"
        >
          Available
          <X className="size-3" aria-hidden="true" />
        </DiscoveryNavigationLink>
      ) : null}
      {query.query ? (
        <DiscoveryNavigationLink
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
        </DiscoveryNavigationLink>
      ) : null}

      {query.categories.map((category) => (
        <DiscoveryNavigationLink
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
        </DiscoveryNavigationLink>
      ))}

      {visibleMetadataStatuses.map((status) => (
        <DiscoveryNavigationLink
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
        </DiscoveryNavigationLink>
      ))}

      {query.healthStatuses.map((status) => (
        <DiscoveryNavigationLink
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
        </DiscoveryNavigationLink>
      ))}

      {query.scoreBands.map((band) => {
        const option = discoveryScoreBands.find(
          (candidate) => candidate.value === band,
        );
        const label = option
          ? `${option.label} rating (${option.rangeLabel})`
          : band;

        return (
          <DiscoveryNavigationLink
            key={band}
            href={buildDiscoveryHref(query, {
              page: 1,
              scoreBands: query.scoreBands.filter((value) => value !== band),
            })}
            className="inline-flex items-center gap-1.5 rounded-full border border-input bg-secondary px-3 py-1.5 text-xs font-medium text-foreground outline-none hover:border-brand/60 focus-visible:ring-3 focus-visible:ring-ring/30"
            aria-label={`Remove ${label} filter`}
          >
            {label}
            <X className="size-3" aria-hidden="true" />
          </DiscoveryNavigationLink>
        );
      })}

      {query.registrationPeriod ? (
        <DiscoveryNavigationLink
          href={buildDiscoveryHref(query, {
            page: 1,
            registrationPeriod: null,
          })}
          className="inline-flex items-center gap-1.5 rounded-full border border-input bg-secondary px-3 py-1.5 text-xs font-medium text-foreground outline-none hover:border-brand/60 focus-visible:ring-3 focus-visible:ring-ring/30"
          aria-label="Remove registration date filter"
        >
          {discoveryRegistrationPeriods.find(
            (period) => period.value === query.registrationPeriod,
          )?.label ?? "Registration date"}
          <X className="size-3" aria-hidden="true" />
        </DiscoveryNavigationLink>
      ) : null}

      <DiscoveryNavigationLink
        href="/discover"
        className="rounded-sm px-1 py-1 text-xs font-semibold text-brand outline-none hover:text-brand-hover focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        Clear all
      </DiscoveryNavigationLink>
    </div>
  );
}
