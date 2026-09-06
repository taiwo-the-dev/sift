import { CircleAlert, Database, RefreshCw } from "lucide-react";
import Link from "next/link";

import type { CatalogueNetworkStatus } from "@/features/catalogue/status";
import type { DiscoveryQuery } from "@/features/discovery/model";
import { buildDiscoveryHref } from "@/features/discovery/query";
import { cn } from "@/lib/utils";

interface NetworkStatusProps {
  query: DiscoveryQuery;
  statuses: readonly CatalogueNetworkStatus[] | null;
}

const timestampFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

function formatTimestamp(value: string | null): string {
  if (!value) {
    return "No successful checkpoint recorded";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Checkpoint time unavailable"
    : `${timestampFormatter.format(date)} UTC`;
}

function describeState(status: CatalogueNetworkStatus): string {
  if (status.phase === "unavailable") {
    return "Directory unavailable";
  }

  if (status.phase === "partial") {
    return status.isStale ? "Update delayed" : "Updating";
  }

  return status.isStale ? "Update overdue" : "Up to date";
}

export function NetworkStatus({ query, statuses }: NetworkStatusProps) {
  if (!statuses) {
    return (
      <div
        className="mb-6 flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.045] px-4 py-4"
        role="status"
      >
        <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border border-amber-400/20 bg-amber-400/8 text-amber-200">
          <CircleAlert className="size-4" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Network status is temporarily unavailable
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Results are available, but sync details could not be loaded.
          </p>
        </div>
      </div>
    );
  }

  const visible = statuses.filter((status) =>
    query.network === "all"
      ? true
      : status.network === query.network,
  );

  return (
    <div className="mb-6 grid gap-3" aria-label="Agent directory status">
      {visible.map((status) => {
        const needsAttention = status.phase !== "current" || status.isStale;

        return (
          <div
            key={status.network}
            className={cn(
              "flex flex-col gap-4 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
              needsAttention
                ? "border-amber-400/20 bg-amber-400/[0.045]"
                : "border-brand/20 bg-brand/[0.035]",
            )}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={cn(
                  "mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg border",
                  needsAttention
                    ? "border-amber-400/20 bg-amber-400/8 text-amber-200"
                    : "border-brand/20 bg-brand/8 text-brand",
                )}
              >
                {needsAttention ? (
                  <CircleAlert className="size-4" aria-hidden="true" />
                ) : (
                  <Database className="size-4" aria-hidden="true" />
                )}
              </span>
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  {status.label}
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 font-mono text-[0.65rem] text-muted-foreground">
                    Chain {status.chainId}
                  </span>
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {describeState(status)} · {status.agentCountIsEstimate ? "approximately " : ""}
                  {status.agentCount.toLocaleString("en")} agents
                </p>
                <p className="mt-0.5 text-[0.68rem] text-muted-foreground/80">
                  Last updated {formatTimestamp(status.checkpointUpdatedAt)}
                  {status.checkpoint === null
                    ? ""
                    : ` · block ${status.checkpoint.toLocaleString("en")}`}
                </p>
              </div>
            </div>

            {status.network === "bsc-mainnet" &&
            !status.agentCountIsEstimate &&
            status.agentCount === 0 ? (
              <Link
                href={buildDiscoveryHref(query, {
                  network: "bsc-testnet",
                  page: 1,
                })}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground outline-none hover:border-brand/40 focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                View testnet agents
              </Link>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
