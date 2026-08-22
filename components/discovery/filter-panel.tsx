import { SlidersHorizontal } from "lucide-react";
import Form from "next/form";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  discoveryCategories,
  discoveryMetadataStatuses,
  type DiscoveryQuery,
} from "@/features/discovery/model";

interface FilterPanelProps {
  query: DiscoveryQuery;
}

interface FilterFormProps extends FilterPanelProps {
  idPrefix: string;
}

function FilterForm({ idPrefix, query }: FilterFormProps) {
  return (
    <Form action="/discover" className="space-y-7">
      {query.query ? <input type="hidden" name="q" value={query.query} /> : null}
      {query.sort !== (query.query ? "relevance" : "recent") ? (
        <input type="hidden" name="sort" value={query.sort} />
      ) : null}
      {query.pageSize !== 12 ? (
        <input type="hidden" name="size" value={query.pageSize} />
      ) : null}

      <fieldset>
        <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Category
        </legend>
        <div className="mt-4 space-y-3">
          {discoveryCategories.map((category) => {
            const id = `${idPrefix}-category-${category.slug}`;

            return (
              <label
                key={category.slug}
                htmlFor={id}
                className="group flex cursor-pointer items-start gap-3"
              >
                <input
                  id={id}
                  type="checkbox"
                  name="category"
                  value={category.slug}
                  defaultChecked={query.categories.includes(category.slug)}
                  className="mt-0.5 size-4 shrink-0 appearance-none rounded-[0.2rem] border border-input bg-background checked:border-brand checked:bg-brand focus-visible:ring-3 focus-visible:ring-ring/30 checked:[background-image:linear-gradient(135deg,transparent_42%,#0b0e11_42%,#0b0e11_55%,transparent_55%),linear-gradient(45deg,transparent_44%,#0b0e11_44%,#0b0e11_57%,transparent_57%)]"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground group-hover:text-brand">
                    {category.label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {category.description}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="border-t border-border pt-6">
        <legend className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Metadata provenance
        </legend>
        <div className="mt-4 space-y-3">
          {discoveryMetadataStatuses.map((status) => {
            const id = `${idPrefix}-metadata-${status.value}`;

            return (
              <label
                key={status.value}
                htmlFor={id}
                className="flex cursor-pointer items-center gap-3 text-sm font-medium text-foreground hover:text-brand"
              >
                <input
                  id={id}
                  type="checkbox"
                  name="metadata"
                  value={status.value}
                  defaultChecked={query.metadataStatuses.includes(status.value)}
                  className="size-4 shrink-0 appearance-none rounded-[0.2rem] border border-input bg-background checked:border-brand checked:bg-brand focus-visible:ring-3 focus-visible:ring-ring/30 checked:[background-image:linear-gradient(135deg,transparent_42%,#0b0e11_42%,#0b0e11_55%,transparent_55%),linear-gradient(45deg,transparent_44%,#0b0e11_44%,#0b0e11_57%,transparent_57%)]"
                />
                {status.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="border-t border-border pt-5">
        <p className="text-xs leading-5 text-muted-foreground">
          Health, trust and risk filters are intentionally unavailable until Sift
          has real supporting observations.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="submit" variant="brand">
          Apply filters
        </Button>
        <Link
          href="/discover"
          className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-3.5 text-sm font-semibold text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
        >
          Clear all
        </Link>
      </div>
    </Form>
  );
}

export function FilterPanel({ query }: FilterPanelProps) {
  const activeCount = query.categories.length + query.metadataStatuses.length;

  return (
    <>
      <details className="group rounded-xl border border-border bg-card lg:hidden">
        <summary className="flex min-h-13 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/30 [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-brand" aria-hidden="true" />
            Filters
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {activeCount > 0 ? `${activeCount} active` : "All agents"}
          </span>
        </summary>
        <div className="border-t border-border p-5">
          <FilterForm idPrefix="mobile" query={query} />
        </div>
      </details>

      <aside className="hidden self-start rounded-xl border border-border bg-card p-6 lg:sticky lg:top-24 lg:block">
        <div className="mb-6 flex items-center justify-between gap-3 border-b border-border pb-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SlidersHorizontal className="size-4 text-brand" aria-hidden="true" />
            Refine results
          </h2>
          {activeCount > 0 ? (
            <span className="text-xs text-muted-foreground">{activeCount} active</span>
          ) : null}
        </div>
        <FilterForm idPrefix="desktop" query={query} />
      </aside>
    </>
  );
}
