"use client";

import { RouteErrorState } from "@/components/states/route-error-state";

interface AgentProfileErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function AgentProfileError({
  error,
  retry,
}: AgentProfileErrorProps) {
  return (
    <RouteErrorState
      backHref="/discover"
      backLabel="Return to discovery"
      description="The indexed catalogue may be temporarily unavailable. Sift has not substituted simulated profile data."
      error={error}
      retry={retry}
      title="We couldn’t load this agent profile"
    />
  );
}
