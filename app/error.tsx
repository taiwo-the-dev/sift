"use client";

import { RouteErrorState } from "@/components/states/route-error-state";

interface AppErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function AppError({ error, retry }: AppErrorProps) {
  return (
    <RouteErrorState
      backHref="/"
      backLabel="Return home"
      description="An unexpected rendering error interrupted this page. No unavailable agent, wallet, or blockchain values were substituted. Try the page again or return home."
      error={error}
      retry={retry}
      title="Sift couldn’t finish loading this page"
    />
  );
}
