import { Skeleton } from "@/components/ui/skeleton";

export default function AgentProfileLoading() {
  return (
    <div
      role="status"
      aria-label="Loading agent profile"
      className="flex-1 bg-background"
    >
      <div className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <Skeleton className="h-4 w-36" />
          <div className="mt-6 flex items-start gap-5">
            <Skeleton className="size-20 shrink-0 rounded-full sm:size-24" />
            <div className="w-full max-w-3xl">
              <Skeleton className="h-6 w-64 rounded-full" />
              <Skeleton className="mt-4 h-10 w-3/4" />
              <Skeleton className="mt-4 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-4/5" />
            </div>
          </div>
          <div className="mt-7 grid gap-px overflow-hidden rounded-xl sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-24 rounded-none" />
            ))}
          </div>
          <Skeleton className="mt-4 h-16 w-full rounded-xl" />
        </div>
      </div>
      <div className="border-b border-border py-3">
        <div className="mx-auto flex w-full max-w-7xl gap-3 px-4 sm:px-6 lg:px-8">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-24" />
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-4 h-9 w-72" />
        <Skeleton className="mt-4 h-4 w-full max-w-2xl" />
        <Skeleton className="mt-8 h-32 w-full rounded-2xl" />
        <Skeleton className="mt-5 h-72 w-full rounded-2xl" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
