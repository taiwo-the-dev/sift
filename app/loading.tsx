import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading Sift"
      className="mx-auto w-full max-w-7xl flex-1 px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-32"
    >
      <Skeleton className="h-5 w-44" />
      <Skeleton className="mt-8 h-14 w-full max-w-3xl" />
      <Skeleton className="mt-3 h-14 w-4/5 max-w-2xl" />
      <Skeleton className="mt-7 h-7 w-full max-w-2xl" />
      <Skeleton className="mt-2 h-7 w-3/4 max-w-xl" />
      <Skeleton className="mt-10 h-28 w-full max-w-4xl rounded-xl" />
      <div className="mt-6 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
        <Skeleton className="h-11" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
