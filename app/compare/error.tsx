"use client";

import { RouteErrorState } from "@/components/states/route-error-state";

interface CompareErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function CompareError({ error, retry }: CompareErrorProps) {
  return (
    <RouteErrorState
      backHref="/discover"
      backLabel="Return to Discover"
      description="Comparison data is temporarily unavailable. Try again shortly."
      error={error}
      retry={retry}
      title="We couldn’t load this comparison"
    />
  );
}
