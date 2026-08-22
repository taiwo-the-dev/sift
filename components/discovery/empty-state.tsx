import { RotateCcw, SearchX } from "lucide-react";
import Link from "next/link";

import { discoveryCategories } from "@/features/discovery/model";

export function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-input bg-card px-5 py-12 text-center sm:px-8 sm:py-16">
      <span className="mx-auto grid size-12 place-items-center rounded-xl border border-border bg-background text-brand">
        <SearchX className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-xl font-semibold tracking-[-0.025em] text-foreground">
        No indexed agents matched this view
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        Try removing a filter, using fewer search terms, or starting from one of
        Sift’s four deterministic category routes.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <Link
          href="/discover"
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground outline-none hover:bg-brand-hover focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset discovery
        </Link>
        {discoveryCategories.slice(0, 2).map((category) => (
          <Link
            key={category.slug}
            href={`/discover?category=${category.slug}`}
            className="inline-flex h-10 items-center rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            {category.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
