import {
  Activity,
  BriefcaseBusiness,
  CalendarRange,
  Check,
  ChevronDown,
  Clock3,
  FileWarning,
  Gauge,
  Grid3X3,
  Layers3,
  RadioTower,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
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
  icon: Icon,
  label,
  layout = "compact",
}: Readonly<{
  children: ReactNode;
  count: string;
  first?: boolean;
  icon: LucideIcon;
  label: string;
  layout?: "compact" | "wide";
}>) {
  return (
    <fieldset className={cn(!first && "border-t border-border/80 pt-5")}>
      <legend className="flex w-full items-center justify-between gap-3 text-xs font-semibold text-foreground">
        <span className="inline-flex items-center gap-2.5">
          <Icon className="size-3.5 text-brand" aria-hidden="true" />
          {label}
        </span>
        <span className="text-[0.64rem] font-medium text-muted-foreground">
          {count}
        </span>
      </legend>
      <div
        className={cn(
          "mt-3",
          layout === "wide"
            ? "grid grid-cols-1 gap-2"
            : "grid grid-cols-2 gap-2",
        )}
      >
        {children}
      </div>
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
  wide = false,
}: Readonly<{
  href: string;
  icon: LucideIcon;
  label: string;
  role: "checkbox" | "radio";
  selected: boolean;
  sublabel?: string;
  title?: string;
  wide?: boolean;
}>) {
  return (
    <Link
      href={href}
      prefetch={false}
      role={role}
      aria-checked={selected}
      title={title}
      className={cn(
        "group/filter relative flex min-h-10 min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium outline-none transition-[border-color,background-color,color,transform] focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.98]",
        wide && "w-full",
        selected
          ? "border-brand/55 bg-brand/12 text-foreground"
          : "border-transparent bg-secondary/55 text-muted-foreground hover:border-border hover:bg-secondary hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-md border border-border bg-background/70 text-muted-foreground transition-colors group-hover/filter:text-foreground",
          selected && "border-brand/35 bg-brand/10 text-brand",
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block leading-4">{label}</span>
        {sublabel ? (
          <span
            className={cn(
              "mt-0.5 block text-[0.62rem] font-normal leading-3.5",
              selected ? "text-brand/80" : "text-muted-foreground/70",
            )}
          >
            {sublabel}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-[0.3rem] border border-border bg-background/70 text-transparent transition-colors",
          selected && "border-brand bg-brand text-brand-foreground",
        )}
        aria-hidden="true"
      >
        <Check className="size-2.5" strokeWidth={3} />
      </span>
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
        icon={Layers3}
        label="Category"
        layout="wide"
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
              wide
            />
          );
        })}
      </FilterSection>

      <FilterSection
        icon={ShieldCheck}
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
        icon={Gauge}
        label="Sift rating"
        layout="wide"
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
              wide
            />
          );
        })}
      </FilterSection>
      <p className="-mt-2.5 pl-1 text-[0.64rem] leading-5 text-muted-foreground/70">
        Agents without a published rating are not included.
      </p>

      <FilterSection
        icon={CalendarRange}
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
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </span>
        </summary>
        <div className="border-t border-border p-4">
          <FilterOptions query={query} />
        </div>
      </details>

      <aside className="hidden self-start border-r border-border/80 pr-6 lg:sticky lg:top-24 lg:block">
        <div className="pb-5">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2.5 text-base font-semibold text-foreground">
              <span className="grid size-8 place-items-center rounded-lg bg-brand text-brand-foreground">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
              </span>
              <span>
                Refine results
                <span className="mt-0.5 block text-[0.66rem] font-normal text-muted-foreground">
                  Choose what matters to you
                </span>
              </span>
            </span>
            {activeCount > 0 ? (
              <span className="rounded-md border border-brand/25 bg-brand/10 px-2 py-1 text-[0.62rem] font-semibold text-brand">
                {activeCount} active
              </span>
            ) : null}
          </div>
        </div>
        <div className="border-t border-border/80 pt-5">
          <FilterOptions query={query} />
        </div>
      </aside>
    </>
  );
}
