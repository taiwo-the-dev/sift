import {
  ArrowRight,
  CircleAlert,
  GitCompareArrows,
  Plus,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import {
  AgentSelectionActions,
  ComparisonPageActions,
} from "@/components/comparison/comparison-actions";
import { ComparisonSurface } from "@/components/comparison/comparison-surface";
import { buttonVariants } from "@/components/ui/button";
import { findContextualMatch } from "@/features/comparison/match";
import {
  minimumComparisonAgents,
  type ComparisonSelection,
} from "@/features/comparison/model";
import {
  buildDiscoveryHrefForComparison,
  serializeAgentReference,
} from "@/features/comparison/query";
import { getAgentComparison } from "@/features/comparison/service";
import { cn } from "@/lib/utils";

export async function ComparisonResults({
  selection,
}: Readonly<{ selection: ComparisonSelection }>) {
  const result = await getAgentComparison(selection.references);
  const contextualMatch = findContextualMatch(result.agents, selection.goal);
  const ignoredCount =
    selection.invalidCount +
    selection.duplicateCount +
    selection.overflowCount;
  const canCompare = result.agents.length >= minimumComparisonAgents;

  return (
    <section className="sift-data-arrival mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
      <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Comparison workspace
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-foreground">
            {result.agents.length} selected agent
            {result.agents.length === 1 ? "" : "s"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare up to four agents. Empty rows are hidden.
          </p>
        </div>
        {selection.references.length > 0 ? <ComparisonPageActions /> : null}
      </div>

      {ignoredCount > 0 ? (
        <div className="mt-5 flex gap-3 rounded-lg border border-amber-400/25 bg-amber-400/8 p-4 text-amber-100">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="text-sm leading-6">
            {ignoredCount} invalid, duplicate, or over-limit{" "}
            {ignoredCount === 1 ? "selection was" : "selections were"} ignored.
          </p>
        </div>
      ) : null}

      {result.missingAgents.length > 0 ? (
        <div className="mt-5 rounded-xl border border-border bg-card p-5">
          <div className="flex gap-3">
            <CircleAlert
              className="mt-0.5 size-5 shrink-0 text-amber-300"
              aria-hidden="true"
            />
            <div>
              <h2 className="text-base font-semibold text-foreground">
                Some selected agents are unavailable
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                They may no longer be listed or may match more than one
                registration.
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
            className={cn(
              buttonVariants({ variant: "brand", size: "lg" }),
              "mt-7",
            )}
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
              <Sparkles
                className="mt-0.5 size-5 shrink-0 text-brand"
                aria-hidden="true"
              />
              <div>
                <h2 className="font-semibold text-foreground">
                  Best match for this task
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {contextualMatch.reason} Based on currently available agent
                  data.
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
  );
}
