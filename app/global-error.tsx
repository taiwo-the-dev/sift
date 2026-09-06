"use client";

import { RouteErrorState } from "@/components/states/route-error-state";

import "./globals.css";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function GlobalError({ error, retry }: GlobalErrorProps) {
  return (
    <html lang="en" className="h-full bg-background text-foreground">
      <body className="flex min-h-full bg-background text-foreground">
        <title>Sift is temporarily unavailable</title>
        <RouteErrorState
          backHref="/"
          backLabel="Return home"
          description="Try again. If the problem continues, reload the site."
          error={error}
          retry={retry}
          title="Sift is temporarily unavailable"
        />
      </body>
    </html>
  );
}
