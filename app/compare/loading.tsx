import { Skeleton } from "@/components/ui/skeleton";

export default function CompareLoading() {
  return (
    <div
      role="status"
      aria-label="Loading agent comparison"
      className="flex-1 bg-background"
    >
      <div className="border-b border-border bg-card">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-5 h-12 w-full max-w-xl" />
            <Skeleton className="mt-3 h-12 w-4/5 max-w-lg" />
            <Skeleton className="mt-6 h-5 w-full max-w-xl" />
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="mt-8 h-[38rem] w-full" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
