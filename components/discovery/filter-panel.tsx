import {
  Activity,
  BriefcaseBusiness,
  CalendarRange,
  Check,
  CircleEllipsis,
  Clock3,
  FileWarning,
  Gauge,
  Grid3X3,
  RadioTower,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
  TriangleAlert,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  discoveryCategories,
  discoveryRegistrationPeriods,
  discoveryScoreBands,
  type DiscoveryCategory,
  type DiscoveryQuery,
} from "@/features/discovery/model";
import {
  buildDiscoveryHref,
  isReadyAvailabilityQuery,
} from "@/features/discovery/query";
import { cn } from "@/lib/utils";

interface FilterPanelProps {
  query: DiscoveryQuery;
}

const categoryIcons = {
  "grid-trading": Grid3X3,
  "health-factor-monitoring": Activity,
  "liquidity-rebalancing": RefreshCw,
  "yield-optimisation": TrendingUp,
} as const satisfies Readonly<Record<DiscoveryCategory, LucideIcon>>;

const agentStatusOptions = [
  {
    icon: BriefcaseBusiness,
    kind: "availability",
    label: "Available",
    value: "available",
  },
  {
    icon: RadioTower,
    kind: "health",
    label: "Online",
    value: "online",
  },
  {
    icon: WifiOff,
    kind: "health",
    label: "Offline",
    value: "offline",
  },
  {
    icon: TriangleAlert,
    kind: "health",
    label: "Degraded",
    value: "degraded",
  },
  {
    icon: FileWarning,
    kind: "metadata",
    label: "Invalid profile",
    value: "invalid",
  },
  {
    icon: Clock3,
    kind: "metadata",
    label: "Verification pending",
    value: "pending",
  },
] as const;

function countSelectedAgentStatuses(query: DiscoveryQuery): number {
  const hiringAvailabilitySelected = isReadyAvailabilityQuery(query);
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

function FilterSection({
  children,
  count,
  first = false,
  label,
}: Readonly<{
  children: ReactNode;
  count: string;
  first?: boolean;
  label: string;
}>) {
  return (
    <fieldset className={cn(!first && "border-t border-border pt-4")}>
      <legend className="flex w-full items-center justify-between gap-3 text-[0.66rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
        <span className="font-mono text-[0.58rem] tracking-normal text-muted-foreground/60">
          {count}
        </span>
      </legend>
      <div className="mt-2.5 flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function FilterChip({
  href,
  icon: Icon,
  label,
  role,
  selected,
  sublabel,
  title,
}: Readonly<{
  href: string;
  icon: LucideIcon;
  label: string;
  role: "checkbox" | "radio";
  selected: boolean;
  sublabel?: string;
  title?: string;
}>) {
  return (
    <Link
      href={href}
      prefetch={false}
      role={role}
      aria-checked={selected}
      title={title}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border py-1 pr-3 pl-2.5 text-xs font-medium whitespace-nowrap outline-none transition-[border-color,background-color,color] focus-visible:ring-3 focus-visible:ring-ring/30",
        selected
          ? "border-brand/55 bg-brand/14 text-brand"
          : "border-border bg-background/40 text-muted-foreground hover:border-input hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon
        className={cn("size-3.5 shrink-0", selected && "text-brand")}
        aria-hidden="true"
      />
      {label}
      {sublabel ? (
        <span
          className={cn(
            "text-[0.6rem]",
            selected ? "text-brand/70" : "text-muted-foreground/70",
          )}
        >
          {sublabel}
        </span>
      ) : null}
      {selected ? (
        <Check className="size-3 shrink-0" aria-hidden="true" />
      ) : null}
    </Link>
  );
}

function FilterOptions({ query }: FilterPanelProps) {
  const hiringSupportSelected = isReadyAvailabilityQuery(query);
  const selectedAgentStatusCount = countSelectedAgentStatuses(query);

  return (
    <div className="space-y-4">
      <FilterSection
        first
        label="Category"
        count={
          query.categories.length > 0
            ? `${query.categories.length} selected`
            : "Any"
        }
      >
        {discoveryCategories.map((category) => {
          const selected = query.categories.includes(category.slug);
          const nextCategories = selected
            ? query.categories.filter((value) => value !== category.slug)
            : [...query.categories, category.slug];

          return (
            <FilterChip
              key={category.slug}
              href={buildDiscoveryHref(query, {
                categories: nextCategories,
                page: 1,
              })}
              icon={categoryIcons[category.slug]}
              label={category.label}
              role="checkbox"
              selected={selected}
            />
          );
        })}
      </FilterSection>

      <FilterSection
        label="Agent status"
        count={
          selectedAgentStatusCount > 0 ? `${selectedAgentStatusCount} selected` : "Any"
        }
      >
        {agentStatusOptions.map((status) => {
          const selected =
            status.kind === "availability"
              ? hiringSupportSelected
              : status.kind === "metadata"
                ? query.metadataStatuses.includes(status.value)
                : query.healthStatuses.includes(status.value);
          const href =
            status.kind === "availability"
              ? buildDiscoveryHref(query, {
                  page: 1,
                  taskAvailability: hiringSupportSelected ? null : "ready",
                })
              : status.kind === "metadata"
                ? buildDiscoveryHref(query, {
                    metadataStatuses: selected
                      ? query.metadataStatuses.filter(
                          (value) => value !== status.value,
                        )
                      : [...query.metadataStatuses, status.value],
                    page: 1,
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
            <FilterChip
              key={`${status.kind}:${status.value}`}
              href={href}
              icon={status.icon}
              label={status.label}
              role="checkbox"
              selected={selected}
              title={
                status.kind === "availability"
                  ? "Show agents with a service Sift checked in the last 24 hours"
                  : undefined
              }
            />
          );
        })}
      </FilterSection>

      <FilterSection
        label="Sift rating"
        count={
          query.scoreBands.length > 0 ? `${query.scoreBands.length} selected` : "Any"
        }
      >
        {discoveryScoreBands.map((band) => {
          const selected = query.scoreBands.includes(band.value);
          const nextBands = selected
            ? query.scoreBands.filter((value) => value !== band.value)
            : [...query.scoreBands, band.value];

          return (
            <FilterChip
              key={band.value}
              href={buildDiscoveryHref(query, {
                page: 1,
                scoreBands: nextBands,
              })}
              icon={Gauge}
              label={band.label}
              role="checkbox"
              selected={selected}
              sublabel={band.rangeLabel}
            />
          );
        })}
      </FilterSection>
      <p className="-mt-2.5 text-[0.62rem] leading-5 text-muted-foreground/70">
        Uses published Sift Scores. Unscored agents are excluded.
      </p>

      <FilterSection
        label="Registered"
        count={query.registrationPeriod ? "1 selected" : "Any time"}
      >
        {discoveryRegistrationPeriods.map((period) => {
          const selected = query.registrationPeriod === period.value;

          return (
            <FilterChip
              key={period.value}
              href={buildDiscoveryHref(query, {
                page: 1,
                registrationPeriod: selected ? null : period.value,
              })}
              icon={CalendarRange}
              label={period.label}
              role="radio"
              selected={selected}
            />
          );
        })}
      </FilterSection>

      <Link
        href="/discover"
        prefetch={false}
        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-border bg-background text-xs font-semibold text-foreground outline-none transition-colors hover:border-brand/25 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Clear filters
      </Link>
    </div>
  );
}

export function FilterPanel({ query }: FilterPanelProps) {
  const activeCount =
    query.categories.length +
    countSelectedAgentStatuses(query) +
    query.scoreBands.length +
    (query.registrationPeriod ? 1 : 0) +
    (query.network === "bsc-mainnet" ? 0 : 1);

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
        <div className="border-t border-border p-4">
          <FilterOptions query={query} />
        </div>
      </details>

      <aside className="hidden self-start overflow-hidden rounded-2xl border border-border bg-card lg:sticky lg:top-24 lg:block">
        <div className="border-b border-border bg-[linear-gradient(135deg,rgba(240,185,11,0.09),transparent_62%)] px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2.5 text-base font-semibold text-foreground">
              <span className="grid size-8 place-items-center rounded-lg border border-brand/20 bg-brand/10 text-brand">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
              </span>
              Filters
            </span>
            {activeCount > 0 ? (
              <span className="rounded-full border border-brand/20 bg-brand/8 px-2 py-1 text-[0.62rem] font-semibold text-brand">
                {activeCount} active
              </span>
            ) : null}
          </div>
        </div>
        <div className="p-4">
          <FilterOptions query={query} />
        </div>
      </aside>
    </>
  );
}
