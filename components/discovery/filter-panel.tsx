import {
  Activity,
  BriefcaseBusiness,
  Check,
  CircleEllipsis,
  Database,
  FlaskConical,
  Globe2,
  Grid3X3,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import {
  discoveryCategories,
  discoveryNetworkOptions,
  type DiscoveryCategory,
  type DiscoveryNetworkScope,
  type DiscoveryQuery,
} from "@/features/discovery/model";
import {
  buildDiscoveryHref,
  isHiringAvailabilityQuery,
} from "@/features/discovery/query";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  query: DiscoveryQuery;
}

const networkIcons = {
  all: Globe2,
  "bsc-mainnet": Database,
  "bsc-testnet": FlaskConical,
} as const satisfies Readonly<Record<DiscoveryNetworkScope, LucideIcon>>;

const categoryIcons = {
  "grid-trading": Grid3X3,
  "health-factor-monitoring": Activity,
  "liquidity-rebalancing": RefreshCw,
  "yield-optimisation": TrendingUp,
} as const satisfies Readonly<Record<DiscoveryCategory, LucideIcon>>;

const agentStatusOptions = [
  { kind: "availability", label: "Available", value: "available" },
  { kind: "metadata", label: "Invalid profile data", value: "invalid" },
  { kind: "health", label: "Online", value: "online" },
  { kind: "health", label: "Offline", value: "offline" },
  { kind: "health", label: "Degraded", value: "degraded" },
  { kind: "metadata", label: "Verification pending", value: "pending" },
] as const;

function countSelectedAgentStatuses(query: DiscoveryQuery): number {
  const hiringAvailabilitySelected = isHiringAvailabilityQuery(query);
  const metadataCount = query.metadataStatuses.filter((status) =>
    agentStatusOptions.some(
      (option) => option.kind === "metadata" && option.value === status,
    ),
  ).length;
  const healthCount = query.healthStatuses.filter((status) =>
    agentStatusOptions.some(
      (option) => option.kind === "health" && option.value === status,
    ),
  ).length;

  return metadataCount + healthCount + (hiringAvailabilitySelected ? 1 : 0);
}

function FilterOptions({ query }: FilterPanelProps) {
  const hiringSupportSelected = isHiringAvailabilityQuery(query);
  const selectedAgentStatusCount = countSelectedAgentStatuses(query);
  const metadataWithoutHiringRequirement = query.metadataStatuses.filter(
    (status) => status !== "valid",
  );

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="flex w-full items-center justify-between gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Network
          <span className="font-mono text-[0.6rem] tracking-normal text-muted-foreground/65">
            1 selected
          </span>
        </legend>
        <div className="mt-3 grid gap-2">
          {discoveryNetworkOptions.map((network) => {
            const selected = query.network === network.value;
            const Icon = networkIcons[network.value];

            return (
              <Link
                key={network.value}
                href={buildDiscoveryHref(query, {
                  network: network.value,
                  page: 1,
                })}
                prefetch={false}
                aria-current={selected ? "true" : undefined}
                className={cn(
                  "group grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border px-3 py-2.5 outline-none transition-[border-color,background-color,color] focus-visible:ring-3 focus-visible:ring-ring/30",
                  selected
                    ? "border-brand/35 bg-brand/8"
                    : "border-border bg-background/45 hover:border-brand/25 hover:bg-background",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-lg border transition-colors",
                    selected
                      ? "border-brand/25 bg-brand/10 text-brand"
                      : "border-border bg-card text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-foreground">
                    {network.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[0.66rem] text-muted-foreground">
                    {network.value === "bsc-mainnet"
                      ? "Chain 56 · Production"
                      : network.value === "bsc-testnet"
                        ? "Chain 97 · Testing"
                        : "Chain 56 + 97"}
                  </span>
                </span>
                <span
                  className={cn(
                    "grid size-5 place-items-center rounded-full border",
                    selected
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-input text-transparent",
                  )}
                >
                  <Check className="size-3" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="border-t border-border pt-5">
        <legend className="flex w-full items-center justify-between gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Category
          <span className="font-mono text-[0.6rem] tracking-normal text-muted-foreground/65">
            {query.categories.length > 0
              ? `${query.categories.length} selected`
              : "Any"}
          </span>
        </legend>
        <div className="mt-3 grid gap-2">
          {discoveryCategories.map((category) => {
            const selected = query.categories.includes(category.slug);
            const Icon = categoryIcons[category.slug];
            const nextCategories = selected
              ? query.categories.filter((value) => value !== category.slug)
              : [...query.categories, category.slug];

            return (
              <Link
                key={category.slug}
                href={buildDiscoveryHref(query, {
                  categories: nextCategories,
                  page: 1,
                })}
                prefetch={false}
                role="checkbox"
                aria-checked={selected}
                className={cn(
                  "group flex min-h-12 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium outline-none transition-[border-color,background-color,color] focus-visible:ring-3 focus-visible:ring-ring/30",
                  selected
                    ? "border-brand/35 bg-brand/8 text-foreground"
                    : "border-border bg-background/45 text-muted-foreground hover:border-brand/25 hover:bg-background hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    selected ? "text-brand" : "text-muted-foreground",
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 leading-5">
                  {category.label}
                </span>
                <span
                  className={cn(
                    "grid size-4 shrink-0 place-items-center rounded border",
                    selected
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-input text-transparent",
                  )}
                >
                  <Check className="size-2.5" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="border-t border-border pt-5">
        <legend className="flex w-full items-center justify-between gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Agent status
          <span className="font-mono text-[0.6rem] tracking-normal text-muted-foreground/65">
            {selectedAgentStatusCount > 0
              ? `${selectedAgentStatusCount} selected`
              : "Any"}
          </span>
        </legend>
        <div className="mt-3 flex flex-wrap items-stretch gap-2">
          {agentStatusOptions.map((status) => {
            const selectableMetadataStatuses = hiringSupportSelected
              ? metadataWithoutHiringRequirement
              : query.metadataStatuses;
            const selected =
              status.kind === "availability"
                ? hiringSupportSelected
                : status.kind === "metadata"
                  ? selectableMetadataStatuses.includes(status.value)
                  : query.healthStatuses.includes(status.value);
            const href =
              status.kind === "availability"
                ? hiringSupportSelected
                  ? buildDiscoveryHref(query, {
                      metadataStatuses: metadataWithoutHiringRequirement,
                      network: "bsc-mainnet",
                      page: 1,
                      query: "",
                      sort: "recent",
                    })
                  : buildDiscoveryHref(query, {
                      metadataStatuses: [
                        ...new Set([
                          ...query.metadataStatuses,
                          "valid" as const,
                        ]),
                      ],
                      network: "all",
                      page: 1,
                      query: "ERC-8183",
                      sort: "relevance",
                    })
                : status.kind === "metadata"
                  ? buildDiscoveryHref(query, {
                      metadataStatuses: selected
                        ? selectableMetadataStatuses.filter(
                            (value) => value !== status.value,
                          )
                        : [...selectableMetadataStatuses, status.value],
                      network: hiringSupportSelected
                        ? "bsc-mainnet"
                        : query.network,
                      page: 1,
                      query: hiringSupportSelected ? "" : query.query,
                      sort: hiringSupportSelected ? "recent" : query.sort,
                    })
                  : buildDiscoveryHref(query, {
                      healthStatuses: selected
                        ? query.healthStatuses.filter(
                            (value) => value !== status.value,
                          )
                        : [...query.healthStatuses, status.value],
                      page: 1,
                    });

            return (
              <Link
                key={`${status.kind}:${status.value}`}
                href={href}
                prefetch={false}
                role="checkbox"
                aria-checked={selected}
                title={
                  status.kind === "availability"
                    ? "Show verified agents that list supported hiring"
                    : undefined
                }
                className={cn(
                  "inline-flex h-9 w-fit items-center gap-2 rounded-full border px-3 text-xs font-medium whitespace-nowrap outline-none transition-[border-color,background-color,color] focus-visible:ring-3 focus-visible:ring-ring/30",
                  selected
                    ? "border-brand/40 bg-brand/12 text-brand"
                    : "border-border bg-background/45 text-muted-foreground hover:border-brand/25 hover:bg-background hover:text-foreground",
                )}
              >
                {status.kind === "availability" ? (
                  <BriefcaseBusiness className="size-3.5" aria-hidden="true" />
                ) : (
                  <span
                    className={cn(
                      "size-1.5 shrink-0 rounded-full",
                      selected ? "bg-brand" : "bg-muted-foreground/45",
                    )}
                    aria-hidden="true"
                  />
                )}
                {status.label}
              </Link>
            );
          })}
        </div>
      </fieldset>

      <Link
        href="/discover"
        prefetch={false}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-3.5 text-sm font-semibold text-foreground outline-none transition-colors hover:border-brand/25 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Clear filters
      </Link>
    </div>
  );
}

export function FilterPanel({ query }: FilterPanelProps) {
  const hiringAvailabilitySelected = isHiringAvailabilityQuery(query);
  const activeCount =
    query.categories.length +
    countSelectedAgentStatuses(query) +
    (query.network === "bsc-mainnet" || hiringAvailabilitySelected ? 0 : 1);

  return (
    <>
      <details className="group overflow-hidden rounded-xl border border-border bg-card lg:hidden">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg border border-brand/20 bg-brand/8 text-brand">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
            </span>
            Filter agents
          </span>
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
            {activeCount > 0 ? `${activeCount} active` : "All agents"}
            <CircleEllipsis className="size-4" aria-hidden="true" />
          </span>
        </summary>
        <div className="border-t border-border p-4 sm:p-5">
          <FilterOptions query={query} />
        </div>
      </details>

      <aside className="hidden self-start overflow-hidden rounded-2xl border border-border bg-card lg:sticky lg:top-24 lg:block">
        <div className="border-b border-border bg-[linear-gradient(135deg,rgba(240,185,11,0.09),transparent_62%)] p-5">
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-9 place-items-center rounded-lg border border-brand/20 bg-brand/10 text-brand">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
            </span>
            {activeCount > 0 ? (
              <span className="rounded-full border border-brand/20 bg-brand/8 px-2 py-1 text-[0.62rem] font-semibold text-brand">
                {activeCount} active
              </span>
            ) : null}
          </div>
          <h2 className="mt-4 text-base font-semibold text-foreground">
            Filters
          </h2>
        </div>
        <div className="p-5">
          <FilterOptions query={query} />
        </div>
      </aside>
    </>
  );
}
