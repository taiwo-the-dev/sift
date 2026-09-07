import { LoaderCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export function HiringAgentLoading() {
  return (
    <div
      className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      aria-label="Loading agent hiring details"
      aria-busy="true"
    >
      <p className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <LoaderCircle
          className="size-4 animate-spin text-brand motion-reduce:animate-none"
          aria-hidden="true"
        />
        Loading agent details…
      </p>
      <div className="grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-[38rem] rounded-2xl" />
      </div>
    </div>
  );
}
