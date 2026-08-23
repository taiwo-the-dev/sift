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
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Compare AI agents",
  description:
    "Compare real indexed BNB Chain agent evidence side by side for your stated goal.",
};

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
              Evidence-led comparison
            </p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
              Compare agents for the job at hand.
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
              Review the same supported evidence side by side. Unknown values
              stay unknown, and any highlighted match is tied only to your
              stated goal.
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
              Your current goal
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
                Apply goal
              </button>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              The goal is stored in the shareable URL and only affects the
              documented contextual match rule.
            </p>
          </form>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Selected evidence sets
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-foreground">
              {result.agents.length} available agent{result.agents.length === 1 ? "" : "s"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Select 2–4 indexed identities to activate side-by-side comparison.
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
              {ignoredCount} invalid, duplicate, or over-limit URL {ignoredCount === 1 ? "entry was" : "entries were"} ignored before data was requested.
            </p>
          </div>
        ) : null}

        {result.missingAgents.length > 0 ? (
          <div className="mt-5 rounded-xl border border-border bg-card p-5">
            <div className="flex gap-3">
              <CircleAlert className="mt-0.5 size-5 shrink-0 text-amber-300" aria-hidden="true" />
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Some selected identities are unavailable
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  They may no longer be indexed or may map to more than one registry record. Sift did not substitute another agent.
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
                      ? "Ambiguous registry identity"
                      : "Indexed identity not found"}
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
              Add agents from Discover or an agent profile. Your selection will
              stay on this device and the comparison URL can be shared.
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
              Remove the unavailable identities above or choose current indexed agents.
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
                    One selection is saved. Comparison starts at two available identities.
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
                    Best match for your stated requirements
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    {contextualMatch.reason} This is contextual decision support, not a universal ranking or safety guarantee.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-5 rounded-xl border border-border bg-card p-5">
                <h2 className="font-semibold text-foreground">
                  No contextual match highlighted
                </h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {selection.goal
                    ? "The current goal produced insufficient evidence or a tie, so Sift left the decision unresolved."
                    : "Add a specific goal above to evaluate supported category and metadata matches."}
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
