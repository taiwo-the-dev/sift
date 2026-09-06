"use client";

import { RouteErrorState } from "@/components/states/route-error-state";

interface DiscoverErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function DiscoverError({ error, retry }: DiscoverErrorProps) {
  return (
    <RouteErrorState
      backHref="/"
      backLabel="Return home"
      description="The agent directory is temporarily unavailable. Try again shortly."
      error={error}
      retry={retry}
      title="We couldn’t load the agent directory"
    />
  );
}
