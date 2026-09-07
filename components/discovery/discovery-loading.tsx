import { LoaderCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export function NetworkStatusLoading() {
  return (
    <div
      className="mb-6 flex items-center gap-3 rounded-xl border border-border bg-card/45 px-4 py-4"
      aria-label="Loading agent directory status"
      aria-busy="true"
    >
      <Skeleton className="size-9 shrink-0 rounded-lg" />
      <div className="flex-1">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-3 w-64 max-w-full" />
      </div>
    </div>
  );
}

export function DiscoveryResultsLoading() {
  return (
    <div aria-label="Loading matching agents" aria-busy="true">
      <div className="flex items-end justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Agents
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm font-medium text-foreground">
            <LoaderCircle
              className="size-4 animate-spin text-brand motion-reduce:animate-none"
              aria-hidden="true"
            />
            Loading agents…
          </p>
        </div>
        <div className="hidden gap-3 sm:flex">
          <Skeleton className="h-11 w-64 rounded-lg" />
          <Skeleton className="h-11 w-40 rounded-lg" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3">
        {Array.from({ length: 5 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-5 sm:p-5"
          >
            <Skeleton className="size-16 rounded-full sm:size-[4.5rem]" />
            <div className="min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="w-3/5">
                  <Skeleton className="h-3 w-32 max-w-full" />
                  <Skeleton className="mt-2 h-6 w-full" />
                  <Skeleton className="mt-2 h-3 w-24" />
                </div>
                <Skeleton className="hidden h-6 w-28 rounded-full sm:block" />
              </div>
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
              <div className="mt-4 flex gap-2 border-t border-border pt-4">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading matching agents…</span>
    </div>
  );
}
