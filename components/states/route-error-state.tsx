"use client";

import { CircleAlert, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";

import { Button } from "@/components/ui/button";

interface RouteErrorStateProps {
  backHref: string;
  backLabel: string;
  description: string;
  error?: Error & { digest?: string };
  retry: () => void;
  title: string;
}

export function RouteErrorState({
  backHref,
  backLabel,
  description,
  error,
  retry,
  title,
}: RouteErrorStateProps) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <section
        aria-labelledby={headingId}
        className="w-full rounded-xl border border-border bg-card px-6 py-12 text-center sm:px-10 sm:py-16"
      >
        <span className="mx-auto grid size-12 place-items-center rounded-xl border border-destructive/30 bg-destructive/8 text-destructive">
          <CircleAlert className="size-5" aria-hidden="true" />
        </span>
        <h1
          ref={headingRef}
          id={headingId}
          tabIndex={-1}
          className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-foreground outline-none sm:text-3xl"
        >
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Button type="button" variant="brand" size="lg" onClick={retry}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Try again
          </Button>
          <Link
            href={backHref}
            className="inline-flex h-12 items-center justify-center rounded-lg border border-border bg-background px-5 text-sm font-semibold text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {backLabel}
          </Link>
        </div>
        {error?.digest ? (
          <p className="mt-6 text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        ) : null}
      </section>
    </div>
  );
}
