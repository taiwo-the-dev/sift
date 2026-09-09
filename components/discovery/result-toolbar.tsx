"use client";

import { ArrowUpDown, Grid2X2, Rows3 } from "lucide-react";
import { useRouter } from "next/navigation";

import { SelectField } from "@/components/ui/select-field";
import {
  discoveryPageSizes,
  discoverySortOptions,
  type DiscoveryQuery,
} from "@/features/discovery/model";
import { buildDiscoveryHref } from "@/features/discovery/query";
import { cn } from "@/lib/utils";

interface ResultToolbarProps {
  hasMoreResults: boolean;
  query: DiscoveryQuery;
  resultCount: number;
  totalCount: number | null;
}

const countFormatter = new Intl.NumberFormat("en");

export function ResultToolbar({
  hasMoreResults,
  query,
  resultCount,
  totalCount,
}: ResultToolbarProps) {
  const router = useRouter();
  const displayedCount = totalCount ?? resultCount;
  const availableSortOptions = discoverySortOptions.filter(
    (option) => query.query || option.value !== "relevance",
  );

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div aria-live="polite" aria-atomic="true">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Agents
        </p>
        <p className="mt-1 text-lg font-semibold text-foreground">
          {countFormatter.format(displayedCount)} {displayedCount === 1 ? "agent" : "agents"}
          {totalCount === null ? " on this page" : ""}
        </p>
        {totalCount === null && hasMoreResults ? (
          <p className="mt-1 text-xs text-muted-foreground">
            More matching agents are available.
          </p>
        ) : null}
      </div>

      <div className="grid w-full items-end gap-3 sm:grid-cols-[auto_minmax(0,1fr)_8.5rem] xl:w-auto">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">
            View
          </p>
          <div
            className="flex h-11 items-center rounded-lg border border-input bg-background p-1"
            aria-label="Agent result layout"
          >
            {([
              { icon: Grid2X2, label: "Grid", value: "grid" },
              { icon: Rows3, label: "Landscape", value: "landscape" },
            ] as const).map((option) => {
              const Icon = option.icon;
              const active = query.view === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    router.push(
                      buildDiscoveryHref(query, {
                        page: 1,
                        view: option.value,
                      }),
                      { scroll: false },
                    );
                  }}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30",
                    active
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" aria-hidden="true" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        <SelectField
          icon={ArrowUpDown}
          label="Sort by"
          onValueChange={(sort) => {
            router.push(buildDiscoveryHref(query, { page: 1, sort }), {
              scroll: false,
            });
          }}
          options={availableSortOptions}
          triggerClassName="sm:w-52 lg:w-56"
          value={query.sort}
        />
        <SelectField
          icon={Rows3}
          label="Per page"
          onValueChange={(pageSize) => {
            router.push(buildDiscoveryHref(query, { page: 1, pageSize }), {
              scroll: false,
            });
          }}
          options={discoveryPageSizes.map((size) => ({
            label: `${size} agents`,
            value: size,
          }))}
          triggerClassName="sm:w-40"
          value={query.pageSize}
        />
      </div>
    </div>
  );
}
