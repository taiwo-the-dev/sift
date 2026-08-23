"use client";

import { CircleAlert, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function HireError({ reset }: Readonly<{ reset: () => void }>) {
  return (
    <main className="grid flex-1 place-items-center px-4 py-16">
      <section className="max-w-xl rounded-2xl border border-border bg-card p-8 text-center">
        <CircleAlert className="mx-auto size-7 text-amber-300" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Hiring flow unavailable</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Sift could not load the verified agent or saved hiring state. No wallet transaction was submitted by this page.
        </p>
        <Button type="button" className="mt-6" onClick={reset}>
          <RotateCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      </section>
    </main>
  );
}
