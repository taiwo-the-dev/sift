import {
  ArrowRight,
  CircleAlert,
  GitCompareArrows,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import {
  AgentSelectionActions,
  ComparisonPageActions,
} from "@/components/comparison/comparison-actions";
import { ComparisonSurface } from "@/components/comparison/comparison-surface";
import { ComparisonUrlSync } from "@/components/comparison/comparison-url-sync";
import { buttonVariants } from "@/components/ui/button";
import { findContextualMatch } from "@/features/comparison/match";
import { minimumComparisonAgents } from "@/features/comparison/model";
import {
  buildDiscoveryHrefForComparison,
  parseComparisonSearchParams,
  serializeAgentReference,
  type ComparisonSearchParams,
} from "@/features/comparison/query";
import { getAgentComparison } from "@/features/comparison/service";
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
  const result = await getAgentComparison(selection.references);
  const contextualMatch = findContextualMatch(result.agents, selection.goal);
  const ignoredCount =
    selection.invalidCount +
    selection.duplicateCount +
    selection.overflowCount;
  const canCompare = result.agents.length >= minimumComparisonAgents;

  return (
    <div className="min-w-0 flex-1 bg-background">
      <ComparisonUrlSync
        goal={selection.goal}
        references={selection.references}
      />

      <section className="relative overflow-hidden border-b border-border bg-card">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(240,185,11,0.18),transparent_31rem),linear-gradient(118deg,transparent_0%,rgba(240,185,11,0.035)_62%,transparent_100%)]"
        />
        <div className="relative mx-auto grid w-full max-w-7xl gap-8 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(25rem,1.1fr)] lg:items-end lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              <GitCompareArrows className="size-4" aria-hidden="true" />
              Agent comparison
            </p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
              Evaluate agents against your task.
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
              Compare capabilities, health checks, reputation, and services.
              Matches are based on the task you provide.
            </p>
          </div>

          <form
            action="/compare"
            method="get"
            className="rounded-xl border border-border bg-background/85 p-4 shadow-2xl shadow-black/10 sm:p-5"
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
              Task requirements
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                id="comparison-goal"
                name="goal"
                type="search"
                maxLength={180}
                defaultValue={selection.goal}
                placeholder="e.g. Protect my loan from liquidation"
                className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-3.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/20"
              />
              <button
                type="submit"
                className={cn(buttonVariants({ variant: "brand" }), "h-11 px-4")}
              >
                <Search className="size-4" aria-hidden="true" />
                Update task
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Included in the shareable comparison link.
            </p>
          </form>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Selected agents
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-foreground">
              {result.agents.length} available agent{result.agents.length === 1 ? "" : "s"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select 2–4 agents to compare.
            </p>
          </div>
          {selection.references.length > 0 ? (
            <ComparisonPageActions />
          ) : null}
        </div>

        {ignoredCount > 0 ? (
          <div className="mt-5 flex gap-3 rounded-lg border border-amber-400/25 bg-amber-400/8 p-4 text-amber-100">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <p className="text-sm leading-6">
              {ignoredCount} invalid, duplicate, or over-limit {ignoredCount === 1 ? "selection was" : "selections were"} ignored.
            </p>
          </div>
        ) : null}

        {result.missingAgents.length > 0 ? (
          <div className="mt-5 rounded-xl border border-border bg-card p-5">
            <div className="flex gap-3">
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-300" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Some selected agents are unavailable
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  They may no longer be listed or may match more than one registration.
                </p>
              </div>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {result.missingAgents.map((missing) => (
                <li
                  key={serializeAgentReference(missing.reference)}
                  className="rounded-lg border border-border bg-background p-4"
                >
                  <p className="font-mono text-xs text-foreground">
                    {serializeAgentReference(missing.reference)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {missing.reason === "ambiguous"
                      ? "Multiple registrations found"
                      : "Agent not found"}
                  </p>
                  <AgentSelectionActions
                    goal={selection.goal}
                    reference={missing.reference}
                    references={selection.references}
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {selection.references.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card px-5 py-14 text-center sm:px-8">
            <span className="mx-auto grid size-12 place-items-center rounded-xl border border-brand/25 bg-brand/8 text-brand">
              <GitCompareArrows className="size-5" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-foreground">
              Start with two real agents
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
              Select agents from Discover or an agent profile.
            </p>
            <Link
              href="/discover"
              className={cn(buttonVariants({ variant: "brand", size: "lg" }), "mt-7")}
            >
              Discover agents
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        ) : result.agents.length === 0 ? (
          <div className="mt-8 rounded-xl border border-dashed border-border bg-card px-5 py-12 text-center">
            <h2 className="text-xl font-semibold text-foreground">
              No available agents to compare
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Remove the unavailable agents above or choose different agents.
            </p>
          </div>
        ) : (
          <div className="mt-8">
            {!canCompare ? (
              <div className="mb-5 flex flex-col gap-4 rounded-xl border border-brand/20 bg-brand/5 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-foreground">
                    Add one more available agent
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Select at least two agents to compare.
                  </p>
                </div>
                <Link
                  href={buildDiscoveryHrefForComparison(selection.goal)}
                  className={cn(buttonVariants({ variant: "brand" }))}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add another
                </Link>
              </div>
            ) : contextualMatch ? (
              <div className="mb-5 flex gap-3 rounded-xl border border-brand/30 bg-brand/8 p-5">
                <Sparkles className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-foreground">
                    Best match for this task
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {contextualMatch.reason} Based on currently available agent data.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-5 rounded-xl border border-border bg-card p-5">
                <h2 className="font-semibold text-foreground">
                  No task-specific match highlighted
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {selection.goal
                    ? "The available agent data does not show a clear match."
                    : "Add task requirements to assess category and profile matches."}
                </p>
              </div>
            )}

            <ComparisonSurface
              agents={result.agents}
              contextualMatch={canCompare ? contextualMatch : null}
              goal={selection.goal}
              references={selection.references}
            />

            {selection.references.length < 4 ? (
              <div className="mt-6 flex justify-center">
                <Link
                  href={buildDiscoveryHrefForComparison(selection.goal)}
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add another agent
                </Link>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
