"use client";

import { RouteErrorState } from "@/components/states/route-error-state";

export default function HireError({ retry }: Readonly<{ retry: () => void }>) {
  return (
    <RouteErrorState
      backHref="/discover"
      backLabel="Find another agent"
      description="Sift could not load the verified agent or saved hiring state. No wallet transaction was submitted by this page."
      retry={retry}
      title="Hiring flow unavailable"
    />
  );
}
