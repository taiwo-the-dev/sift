import { Skeleton } from "@/components/ui/skeleton";

export default function AgentProfileLoading() {
  return (
    <div
      role="status"
      aria-label="Loading agent profile"
      className="flex-1 bg-background"
    >
      <div className="border-b border-border bg-card">
        <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Skeleton className="h-4 w-36" />
          <div className="mt-8 flex items-start gap-6">
            <Skeleton className="size-24 shrink-0 rounded-full sm:size-28" />
            <div className="w-full max-w-3xl">
              <Skeleton className="h-6 w-40 rounded-full" />
              <Skeleton className="mt-4 h-12 w-3/4" />
              <Skeleton className="mt-5 h-5 w-full" />
              <Skeleton className="mt-2 h-5 w-4/5" />
            </div>
          </div>
          <Skeleton className="mt-8 h-24 w-full rounded-xl" />
        </div>
      </div>
      <div className="border-b border-border py-3">
        <div className="mx-auto flex w-full max-w-7xl gap-3 px-4 sm:px-6 lg:px-8">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-8 w-24" />
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] lg:gap-14">
          <div>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-4 h-9 w-3/4" />
            <Skeleton className="mt-4 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-4/5" />
          </div>
          <div>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="mt-3 h-8 w-5/6" />
            <div className="mt-8 grid grid-cols-2 gap-1">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          </div>
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
