import { Skeleton } from "@/components/ui/skeleton";

export default function HireLoading() {
  return (
    <div
      role="status"
      aria-label="Loading hiring flow"
      className="flex-1 bg-background"
    >
      <div className="border-b border-border bg-card/45">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-4 h-10 w-full max-w-2xl" />
          <Skeleton className="mt-4 h-5 w-full max-w-3xl" />
        </div>
      </div>
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:px-8">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-[38rem] rounded-2xl" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
