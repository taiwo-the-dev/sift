"use client";

import { Select } from "@base-ui/react/select";
import {
  ArrowUpDown,
  Check,
  ChevronDown,
  Rows3,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

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

type SelectOption<Value extends string | number> = Readonly<{
  label: string;
  value: Value;
}>;

interface CatalogueSelectProps<Value extends string | number> {
  icon: LucideIcon;
  label: string;
  onValueChange: (value: Value) => void;
  options: readonly SelectOption<Value>[];
  triggerClassName?: string;
  value: Value;
}

function CatalogueSelect<Value extends string | number>({
  icon: Icon,
  label,
  onValueChange,
  options,
  triggerClassName,
  value,
}: CatalogueSelectProps<Value>) {
  return (
    <Select.Root<Value>
      key={String(value)}
      items={options}
      defaultValue={value}
      onValueChange={(nextValue) => {
        if (nextValue !== null && nextValue !== value) {
          onValueChange(nextValue);
        }
      }}
    >
      <div className="grid min-w-0 gap-1.5">
        <Select.Label className="text-xs font-medium text-muted-foreground">
          {label}
        </Select.Label>

        <Select.Trigger
          className={cn(
            "group flex h-11 w-full cursor-pointer items-center gap-2.5 rounded-lg border border-input bg-background px-3.5 text-left text-sm text-foreground outline-none transition-[border-color,box-shadow] hover:border-muted-foreground/70 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 data-popup-open:border-ring data-popup-open:ring-3 data-popup-open:ring-ring/15",
            triggerClassName,
          )}
        >
          <Icon
            className="size-4 shrink-0 text-muted-foreground transition-colors group-data-[popup-open]:text-brand"
            aria-hidden="true"
          />
          <Select.Value className="min-w-0 flex-1 truncate" />
          <Select.Icon className="grid size-5 shrink-0 place-items-center text-muted-foreground">
            <ChevronDown
              className="size-4 transition-transform duration-150 group-data-[popup-open]:rotate-180"
              aria-hidden="true"
            />
          </Select.Icon>
        </Select.Trigger>
      </div>

      <Select.Portal>
        <Select.Positioner
          align="start"
          alignItemWithTrigger={false}
          side="bottom"
          sideOffset={6}
          className="z-50 w-[var(--anchor-width)] outline-none"
        >
          <Select.Popup className="w-[var(--anchor-width)] origin-[var(--transform-origin)] overflow-hidden rounded-lg border border-input bg-popover p-1.5 text-popover-foreground shadow-2xl shadow-black/45 outline-none transition-[opacity,transform] duration-150 data-ending-style:-translate-y-1 data-ending-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:opacity-0">
            <Select.List className="max-h-72 overflow-y-auto outline-none">
              {options.map((option) => (
                <Select.Item
                  key={String(option.value)}
                  value={option.value}
                  className="grid min-h-11 w-full cursor-pointer grid-cols-[minmax(0,1fr)_1.25rem] items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground outline-none transition-colors data-highlighted:bg-muted data-highlighted:text-foreground data-selected:bg-brand/8 data-selected:text-foreground"
                >
                  <Select.ItemText className="min-w-0 truncate">
                    {option.label}
                  </Select.ItemText>
                  <Select.ItemIndicator className="grid size-5 place-items-center rounded-full bg-brand text-brand-foreground">
                    <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}

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
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
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

      <div className="grid w-full grid-cols-[minmax(0,1fr)_8.5rem] items-end gap-3 sm:flex sm:w-auto">
        <CatalogueSelect
          icon={ArrowUpDown}
          label="Sort by"
          onValueChange={(sort) => {
            router.push(buildDiscoveryHref(query, { page: 1, sort }), {
              scroll: false,
            });
          }}
          options={availableSortOptions}
          triggerClassName="sm:w-64"
          value={query.sort}
        />
        <CatalogueSelect
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
