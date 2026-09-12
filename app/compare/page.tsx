import { GitCompareArrows, Search } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";

import { ComparisonResultsLoading } from "@/components/comparison/comparison-results-loading";
import { ComparisonResults } from "@/components/comparison/comparison-results";
import { ComparisonUrlSync } from "@/components/comparison/comparison-url-sync";
import { buttonVariants } from "@/components/ui/button";
import {
  parseComparisonSearchParams,
  serializeAgentReference,
  type ComparisonSearchParams,
} from "@/features/comparison/query";
import { createPageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

export const metadata: Metadata = createPageMetadata({
  title: "Compare AI agents",
  description:
    "Compare BNB Chain agents by capability, health, reputation, and service data.",
  path: "/compare",
});

interface ComparePageProps {
  searchParams: Promise<ComparisonSearchParams>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const selection = parseComparisonSearchParams(await searchParams);

  return (
    <div className="min-w-0 flex-1 bg-background">
      <ComparisonUrlSync
        goal={selection.goal}
        references={selection.references}
      />

      <section className="relative overflow-hidden border-b border-border bg-background">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_82%_-10%,rgba(240,185,11,0.16),transparent_28rem),linear-gradient(118deg,transparent_0%,rgba(240,185,11,0.025)_62%,transparent_100%)]"
        />
        <div className="relative mx-auto grid w-full max-w-7xl gap-7 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(25rem,1.1fr)] lg:items-end lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              <GitCompareArrows className="size-4" aria-hidden="true" />
              Agent comparison
            </p>
            <h1 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
              Evaluate agents against your task.
            </h1>
            <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
              Review ratings, health, services, and reputation side by side.
              Add your task to highlight the strongest supported match.
            </p>
          </div>

          <form
            action="/compare"
            method="get"
            className="rounded-2xl border border-border bg-card/90 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.16)] backdrop-blur-sm sm:p-5"
          >
            {selection.references.map((reference) => (
              <input
                key={serializeAgentReference(reference)}
                type="hidden"
                name="agent"
                value={serializeAgentReference(reference)}
              />
            ))}
            <label
              htmlFor="comparison-goal"
              className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
            >
              What do you need the agent to do?
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="comparison-goal"
                name="goal"
                type="search"
                maxLength={180}
                defaultValue={selection.goal}
                placeholder="e.g. Monitor my loan health"
                className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
              />
              <button
                type="submit"
                className={cn(
                  buttonVariants({ variant: "brand" }),
                  "h-11 px-4",
                )}
              >
                <Search className="size-4" aria-hidden="true" />
                Update task
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              This helps Sift compare task relevance. It is included in the
              shareable link.
            </p>
          </form>
        </div>
      </section>

      <Suspense fallback={<ComparisonResultsLoading />}>
        <ComparisonResults selection={selection} />
      </Suspense>
    </div>
  );
}
