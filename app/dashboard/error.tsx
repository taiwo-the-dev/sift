"use client";

import { RouteErrorState } from "@/components/states/route-error-state";

export default function DashboardError({ retry }: Readonly<{ retry: () => void }>) {
  return (
    <RouteErrorState
      backHref="/discover"
      backLabel="Browse agents"
      description="No private job data or replacement values were displayed. Try loading the route again."
      retry={retry}
      title="The dashboard shell could not load"
    />
  );
}
