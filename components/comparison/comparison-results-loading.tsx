import { LoaderCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export function ComparisonResultsLoading() {
  return (
    <section
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12"
      aria-label="Loading selected agents"
      aria-busy="true"
    >
      <div className="flex items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Selected agents
          </p>
          <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-foreground">
            <LoaderCircle
              className="size-4 animate-spin text-brand motion-reduce:animate-none"
              aria-hidden="true"
            />
            Loading agents…
          </p>
        </div>
        <Skeleton className="hidden h-10 w-48 rounded-lg sm:block" />
      </div>
      <Skeleton className="mt-8 h-[38rem] w-full rounded-xl" />
    </section>
  );
}
