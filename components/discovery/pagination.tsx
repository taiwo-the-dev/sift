import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

import type { DiscoveryQuery } from "@/features/discovery/model";
import { buildDiscoveryHref } from "@/features/discovery/query";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  query: DiscoveryQuery;
  totalPages: number;
}

function visiblePages(currentPage: number, totalPages: number): readonly number[] {
  const candidates = new Set([
    1,
    totalPages,
    currentPage - 1,
    currentPage,
    currentPage + 1,
  ]);

  return [...candidates]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
}

export function Pagination({ currentPage, query, totalPages }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = visiblePages(currentPage, totalPages);

  return (
    <nav
      aria-label="Discovery result pages"
      className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6"
    >
      <Link
        href={buildDiscoveryHref(query, { page: Math.max(1, currentPage - 1) })}
        aria-disabled={currentPage === 1}
        tabIndex={currentPage === 1 ? -1 : undefined}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none hover:border-input hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30",
          currentPage === 1 && "pointer-events-none opacity-40",
        )}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Previous
      </Link>

      <div className="flex items-center gap-1">
        {pages.map((page, index) => {
          const previousPage = pages[index - 1];
          const hasGap = previousPage !== undefined && page - previousPage > 1;

          return (
            <span key={page} className="flex items-center gap-1">
              {hasGap ? (
                <span className="px-1 text-sm text-muted-foreground">…</span>
              ) : null}
              <Link
                href={buildDiscoveryHref(query, { page })}
                aria-current={page === currentPage ? "page" : undefined}
                className={cn(
                  "grid size-10 place-items-center rounded-lg text-sm font-semibold outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30",
                  page === currentPage
                    ? "bg-brand text-brand-foreground"
                    : "text-muted-foreground",
                )}
              >
                {page}
              </Link>
            </span>
          );
        })}
      </div>

      <Link
        href={buildDiscoveryHref(query, {
          page: Math.min(totalPages, currentPage + 1),
        })}
        aria-disabled={currentPage === totalPages}
        tabIndex={currentPage === totalPages ? -1 : undefined}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none hover:border-input hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30",
          currentPage === totalPages && "pointer-events-none opacity-40",
        )}
      >
        Next
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </nav>
  );
}
