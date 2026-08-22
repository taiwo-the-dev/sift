import { Skeleton } from "@/components/ui/skeleton";

export default function DiscoverLoading() {
  return (
    <div
      role="status"
      aria-label="Loading indexed agents"
      className="flex-1 bg-background"
    >
      <div className="border-b border-border bg-card">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-5 h-12 w-full max-w-lg" />
            <Skeleton className="mt-3 h-12 w-4/5 max-w-md" />
            <Skeleton className="mt-6 h-6 w-full max-w-xl" />
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:px-8">
        <Skeleton className="hidden h-[42rem] lg:block" />
        <div>
          <div className="flex items-end justify-between border-b border-border pb-5">
            <div>
              <Skeleton className="h-3 w-28" />
              <Skeleton className="mt-2 h-7 w-32" />
            </div>
            <Skeleton className="h-9 w-64" />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3">
            {Array.from({ length: 5 }, (_, index) => (
              <div
                key={index}
                className="grid grid-cols-[4rem_minmax(0,1fr)] items-start gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-[4.5rem_minmax(0,1fr)] sm:gap-5 sm:p-5"
              >
                <Skeleton className="size-16 rounded-full sm:size-[4.5rem]" />
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="w-3/5">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="mt-2 h-6 w-full" />
                      <Skeleton className="mt-2 h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-28 rounded-full" />
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
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
