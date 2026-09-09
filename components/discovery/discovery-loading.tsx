import { LoaderCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { DiscoveryView } from "@/features/discovery/model";

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
    <div className="flex min-h-[24rem] flex-col rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="size-9 rounded-lg" />
      </div>
      <div className="mt-5 flex items-center gap-4">
        <Skeleton className="size-16 shrink-0 rounded-full sm:size-[4.5rem]" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-6 w-48 max-w-full" />
          <Skeleton className="mt-2 h-3 w-32 max-w-full" />
        </div>
      </div>
      <div className="mt-5">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-4/5" />
      </div>
      <div className="mt-4 flex gap-2">
        <Skeleton className="h-7 w-28 rounded-md" />
        <Skeleton className="h-7 w-24 rounded-md" />
      </div>
      <div className="mt-5 grid grid-cols-3 divide-x divide-border border-y border-border py-3">
        {Array.from({ length: 3 }, (_, signalIndex) => (
          <div key={signalIndex} className="px-3 first:pl-0 last:pr-0">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="mt-2 h-4 w-16 max-w-full" />
          </div>
        ))}
      </div>
      <div className="mt-auto flex gap-2 pt-5">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 flex-1 rounded-lg" />
      </div>
    </div>
  );
}

function LandscapeCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-3 w-36" />
        <div className="flex gap-2">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div>
          <div className="flex items-center gap-4">
            <Skeleton className="size-16 shrink-0 rounded-full sm:size-[4.5rem]" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-7 w-56 max-w-full" />
              <Skeleton className="mt-2 h-3 w-36 max-w-full" />
            </div>
          </div>
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-4/5" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-7 w-24 rounded-md" />
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-border border-t border-border pt-4 lg:grid-cols-1 lg:divide-x-0 lg:divide-y lg:border-t-0 lg:border-l lg:pt-0 lg:pl-6">
          {Array.from({ length: 3 }, (_, signalIndex) => (
            <div key={signalIndex} className="px-3 py-2 lg:px-0">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="mt-2 h-4 w-20 max-w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DiscoveryResultsLoading({
  view = "grid",
}: Readonly<{ view?: DiscoveryView }>) {
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
      <div
        className={
          view === "grid"
            ? "mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3"
            : "mt-6 grid grid-cols-1 gap-3"
        }
      >
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index}>
            {view === "grid" ? (
              <GridCardSkeleton />
            ) : (
              <LandscapeCardSkeleton />
            )}
          </div>
        ))}
      </div>
      <span className="sr-only">Loading matching agents…</span>
    </div>
  );
}
