"use client";

import { RouteErrorState } from "@/components/states/route-error-state";

export default function HireError({ retry }: Readonly<{ retry: () => void }>) {
  return (
    <RouteErrorState
      backHref="/discover"
      backLabel="Find another agent"
      description="The agent or saved hiring details could not be loaded. No transaction was submitted."
      retry={retry}
      title="Agent hiring unavailable"
    />
  );
}
