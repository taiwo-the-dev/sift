import { ArrowRight, ScanSearch } from "lucide-react";
import Link from "next/link";

import {
  categoryTaxonomy,
  getCategoryDefinition,
  type CategorySlug,
} from "@/features/categories/taxonomy";

export function CategoryContext({ category }: Readonly<{ category: CategorySlug }>) {
  const definition = getCategoryDefinition(category);

  return (
    <section className="mb-6 overflow-hidden rounded-xl border border-brand/20 bg-[linear-gradient(120deg,rgba(240,185,11,0.11),rgba(24,26,32,0.72)_52%,rgba(24,26,32,0.96))] p-5 sm:p-6">
      <div>
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
            <ScanSearch className="size-4" aria-hidden="true" />
            Category · {definition.label}
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground">
            Agents for {definition.label.toLowerCase()}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {definition.description} Published categories and suggested matches
            are labelled separately.
          </p>
        </div>
      </div>
      <nav aria-label="Other agent categories" className="mt-5 flex flex-wrap gap-2 border-t border-border/70 pt-4">
        {categoryTaxonomy.map((item) => (
          <Link
            key={item.slug}
            href={`/discover?category=${item.slug}`}
            className={
              item.slug === category
                ? "inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-brand-foreground"
                : "inline-flex items-center gap-1.5 rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-semibold text-foreground hover:border-brand/30 hover:text-brand"
            }
          >
            {item.label}
            {item.slug !== category ? <ArrowRight className="size-3" aria-hidden="true" /> : null}
          </Link>
        ))}
      </nav>
    </section>
  );
}
