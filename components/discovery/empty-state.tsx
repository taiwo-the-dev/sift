import { RotateCcw, SearchX } from "lucide-react";

import { DiscoveryNavigationLink } from "@/components/discovery/discovery-navigation";
import {
  discoveryCategories,
  type DiscoveryQuery,
} from "@/features/discovery/model";

export function EmptyState({ query }: Readonly<{ query: DiscoveryQuery }>) {
  const scoreRangeSelected = query.scoreBands.length > 0;
  const availabilitySelected = query.taskAvailability === "ready";
  const title = scoreRangeSelected
    ? "No agents match this Sift Score range"
    : availabilitySelected
      ? "No recently checked agents found"
      : "No agents found";
  const description = scoreRangeSelected
    ? "No agent currently has a stored Sift Score in the selected range. Choose another range or clear the filter."
    : availabilitySelected
      ? "Available agents must have a task service that passed a check in the last 24 hours. Try again later or clear the filter."
      : "Try a broader search or clear one of the active filters.";

  return (
    <div className="rounded-xl border border-dashed border-input bg-card px-5 py-12 text-center sm:px-8 sm:py-16">
      <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-background text-brand">
        <SearchX className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-foreground">
        {title}
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <DiscoveryNavigationLink
          href="/discover"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground outline-none hover:bg-brand-hover focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Clear search
        </DiscoveryNavigationLink>
        {discoveryCategories.slice(0, 2).map((category) => (
          <DiscoveryNavigationLink
            key={category.slug}
            href={`/discover?category=${category.slug}`}
            className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {category.label}
          </DiscoveryNavigationLink>
        ))}
      </div>
    </div>
  );
}
