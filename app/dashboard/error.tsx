"use client";

import { CircleAlert, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-20 sm:px-6 lg:px-8">
      <div className="w-full rounded-xl border border-border bg-card px-6 py-14 text-center">
        <CircleAlert className="mx-auto size-6 text-destructive" aria-hidden="true" />
        <h1 className="mt-5 text-2xl font-semibold text-foreground">The dashboard shell could not load</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          No private job data or replacement values were displayed. Try loading the route again.
        </p>
        <Button type="button" variant="brand" size="lg" className="mt-7" onClick={reset}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      </div>
    </div>
  );
}
