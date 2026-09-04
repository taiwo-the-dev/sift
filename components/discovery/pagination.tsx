import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

import type { DiscoveryQuery } from "@/features/discovery/model";
import { buildDiscoveryHref } from "@/features/discovery/query";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  hasNextPage: boolean;
  query: DiscoveryQuery;
}

export function Pagination({
  currentPage,
  hasNextPage,
  query,
}: PaginationProps) {
  if (currentPage === 1 && !hasNextPage) {
    return null;
  }

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

      <p className="text-sm font-semibold text-muted-foreground" aria-live="polite">
        Page {currentPage}
      </p>

      <Link
        href={buildDiscoveryHref(query, {
          page: currentPage + 1,
        })}
        aria-disabled={!hasNextPage}
        tabIndex={!hasNextPage ? -1 : undefined}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground outline-none hover:border-input hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30",
          !hasNextPage && "pointer-events-none opacity-40",
        )}
      >
        Next
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </nav>
  );
}
