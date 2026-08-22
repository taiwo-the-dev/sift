import Form from "next/form";

import { Button } from "@/components/ui/button";
import {
  discoveryPageSizes,
  discoverySortOptions,
  type DiscoveryQuery,
} from "@/features/discovery/model";

interface ResultToolbarProps {
  query: DiscoveryQuery;
  totalCount: number;
}

const countFormatter = new Intl.NumberFormat("en");

export function ResultToolbar({ query, totalCount }: ResultToolbarProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div aria-live="polite" aria-atomic="true">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Indexed catalogue
        </p>
        <p className="mt-1 text-lg font-semibold text-foreground">
          {countFormatter.format(totalCount)} {totalCount === 1 ? "agent" : "agents"}
        </p>
      </div>

      <Form action="/discover" className="flex flex-wrap items-end gap-2">
        {query.query ? <input type="hidden" name="q" value={query.query} /> : null}
        {query.categories.map((category) => (
          <input key={category} type="hidden" name="category" value={category} />
        ))}
        {query.metadataStatuses.map((status) => (
          <input key={status} type="hidden" name="metadata" value={status} />
        ))}

        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Sort by
          <select
            name="sort"
            defaultValue={query.sort}
            className="h-9 min-w-44 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/15"
          >
            {discoverySortOptions
              .filter((option) => query.query || option.value !== "relevance")
              .map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs font-medium text-muted-foreground">
          Per page
          <select
            name="size"
            defaultValue={query.pageSize}
            className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-ring focus:ring-3 focus:ring-ring/15"
          >
            {discoveryPageSizes.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <Button type="submit" variant="outline">
          Update
        </Button>
      </Form>
    </div>
  );
}
