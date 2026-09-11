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

function GridCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-background">
      <div className="border-b border-white/6 bg-card/70 p-4">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-7 w-16 shrink-0 rounded-full" />
        </div>
        <div className="mt-3.5 flex items-center gap-3">
          <Skeleton className="size-16 shrink-0 rounded-full sm:size-[4.5rem]" />
          <div className="min-w-0 flex-1">
            <Skeleton className="h-3 w-24 max-w-full" />
            <Skeleton className="mt-2 h-5 w-40 max-w-full" />
          </div>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-4/5" />
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-6 w-20 rounded-md" />
          <Skeleton className="h-6 w-28 rounded-md" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {Array.from({ length: 2 }, (_, signalIndex) => (
            <Skeleton key={signalIndex} className="h-8 rounded-lg" />
          ))}
        </div>
        <div className="mt-auto flex gap-2 pt-4">
          <Skeleton className="size-9 shrink-0 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </div>
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
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index}>
            <GridCardSkeleton />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading matching agents…</span>
    </div>
  );
}
