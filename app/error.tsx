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
      description="Something interrupted this page. Try again or return home."
      error={error}
      retry={retry}
      title="Sift couldn’t finish loading this page"
    />
  );
}
