import { ArrowLeft, ArrowRight } from "lucide-react";

import { DiscoveryNavigationLink } from "@/components/discovery/discovery-navigation";
import type { DiscoveryQuery } from "@/features/discovery/model";
import { buildDiscoveryHref } from "@/features/discovery/query";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  hasNextPage: boolean;
  query: DiscoveryQuery;
}

function getVisiblePages(
  currentPage: number,
  hasNextPage: boolean,
): readonly number[] {
  const pages = new Set<number>([1, currentPage]);
  const firstNearbyPage = Math.max(1, currentPage - 2);
  const lastNearbyPage = currentPage + (hasNextPage ? 1 : 0);

  for (let page = firstNearbyPage; page <= lastNearbyPage; page += 1) {
    pages.add(page);
  }

  return [...pages].sort((left, right) => left - right);
}

export function Pagination({
  currentPage,
  hasNextPage,
  query,
}: PaginationProps) {
  if (currentPage === 1 && !hasNextPage) {
    return null;
  }

  const visiblePages = getVisiblePages(currentPage, hasNextPage);

  return (
    <nav
      aria-label="Discovery result pages"
      className="mt-10 border-t border-border pt-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <DiscoveryNavigationLink
          href={buildDiscoveryHref(query, { page: Math.max(1, currentPage - 1) })}
          aria-disabled={currentPage === 1}
          tabIndex={currentPage === 1 ? -1 : undefined}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none transition-colors hover:border-input hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30",
            currentPage === 1 && "pointer-events-none opacity-40",
          )}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Previous
        </DiscoveryNavigationLink>

        <div className="order-3 flex w-full items-center justify-center gap-1.5 sm:order-none sm:w-auto">
          {visiblePages.map((page, index) => {
            const previousPage = visiblePages[index - 1];
            const current = page === currentPage;

            return (
              <span key={page} className="contents">
                {previousPage !== undefined && page - previousPage > 1 ? (
                  <span
                    aria-hidden="true"
                    className="grid size-10 place-items-center text-sm text-muted-foreground"
                  >
                    …
                  </span>
                ) : null}
                <DiscoveryNavigationLink
                  href={buildDiscoveryHref(query, { page })}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "grid size-10 place-items-center rounded-lg border text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30",
                    current
                      ? "border-brand bg-brand text-brand-foreground"
                      : "border-border bg-card text-foreground hover:border-input hover:bg-muted",
                  )}
                >
                  {page}
                </DiscoveryNavigationLink>
              </span>
            );
          })}
        </div>

        <DiscoveryNavigationLink
          href={buildDiscoveryHref(query, {
            page: currentPage + 1,
          })}
          aria-disabled={!hasNextPage}
          tabIndex={!hasNextPage ? -1 : undefined}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none transition-colors hover:border-input hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30",
            !hasNextPage && "pointer-events-none opacity-40",
          )}
        >
          Next
          <ArrowRight className="size-4" aria-hidden="true" />
        </DiscoveryNavigationLink>
      </div>

    </nav>
  );
}
