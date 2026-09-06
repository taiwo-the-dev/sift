import {
  Activity,
  BriefcaseBusiness,
  CheckCheck,
  CircleAlert,
  Clock3,
  RefreshCw,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DashboardJobCard } from "@/components/dashboard/job-card";
import { Button, buttonVariants } from "@/components/ui/button";
import type {
  DashboardFilter,
  DashboardSnapshot,
} from "@/features/dashboard/model";
import { dashboardFilters } from "@/features/dashboard/model";
import {
  dashboardCategoryLabel,
  formatDashboardTimestamp,
} from "@/features/dashboard/presentation";
import {
  isDashboardObservationStale,
  shouldPollDashboard,
} from "@/features/dashboard/derive";
import { cn } from "@/lib/utils";

interface DashboardViewProps {
  dashboard: DashboardSnapshot;
  refreshFailed?: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}

const summaryCards = [
  { key: "active", label: "Active tasks", icon: BriefcaseBusiness },
  { key: "completed", label: "Completed tasks", icon: CheckCheck },
  { key: "pending", label: "Pending tasks", icon: Clock3 },
  { key: "totalActivity", label: "Recorded activity", icon: Activity },
] as const;

export function DashboardView({
  dashboard,
  onRefresh,
  refreshFailed = false,
  refreshing,
}: DashboardViewProps) {
  const [filter, setFilter] = useState<DashboardFilter>("all");
  const visibleJobs =
    filter === "all"
      ? dashboard.jobs
      : dashboard.jobs.filter((job) => job.category === filter);
  const stale =
    shouldPollDashboard(dashboard.jobs) &&
    isDashboardObservationStale(dashboard.observedAt);

  return (
    <>
      {refreshFailed || stale ? (
        <div role="status" className="mb-6 flex gap-3 rounded-xl border border-amber-400/25 bg-amber-400/8 p-4 text-amber-100">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="text-sm leading-6">
            {refreshFailed
              ? "The latest refresh failed. Sift is showing the last successfully loaded wallet activity."
              : "This task status may be out of date. Refresh it before taking action."}
          </p>
        </div>
      ) : null}

      {dashboard.partial ? (
        <div role="status" className="mb-6 flex gap-3 rounded-xl border border-amber-400/25 bg-amber-400/8 p-4 text-amber-100">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p className="text-sm leading-6">
            Some blockchain updates could not be loaded. Sift is showing the last
            saved transaction details and marks anything unavailable.
          </p>
        </div>
      ) : null}

      <section aria-label="Dashboard summary" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.key} className="rounded-xl border border-border bg-card p-5 shadow-sm shadow-black/10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{card.label}</p>
                  <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-foreground">{dashboard.summary[card.key]}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-lg border border-brand/20 bg-brand/8 text-brand">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {card.key === "completed"
                  ? "Only ERC-8183 Completed state"
                  : card.key === "totalActivity"
                    ? "Saved wallet and transaction activity"
                    : "Based on saved and verified task status"}
              </p>
            </div>
          );
        })}
      </section>

      <section className="mt-8" aria-labelledby="wallet-jobs-heading">
        <div className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Connected wallet</p>
            <h2 id="wallet-jobs-heading" className="mt-2 text-2xl font-semibold tracking-[-0.035em] text-foreground">Agent tasks</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Last refreshed {formatDashboardTimestamp(dashboard.observedAt)}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onRefresh} disabled={refreshing} aria-live="polite">
            <RefreshCw className={cn("size-4", refreshing && "animate-spin")} aria-hidden="true" />
            {refreshing ? "Refreshing…" : "Refresh activity"}
          </Button>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter agent tasks by status">
          {dashboardFilters.map((candidate) => {
            const count =
              candidate === "all"
                ? dashboard.jobs.length
                : dashboard.jobs.filter((job) => job.category === candidate).length;
            return (
              <button
                key={candidate}
                type="button"
                aria-pressed={filter === candidate}
                onClick={() => setFilter(candidate)}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-sm font-semibold outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30",
                  filter === candidate
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {candidate === "all" ? "All tasks" : dashboardCategoryLabel(candidate)}
                <span className={cn("rounded-full px-1.5 py-0.5 text-[0.65rem]", filter === candidate ? "bg-black/15" : "bg-background")}>{count}</span>
              </button>
            );
          })}
        </div>

        {dashboard.jobs.length === 0 ? (
          <div className="mt-7 rounded-xl border border-dashed border-border bg-card px-5 py-14 text-center sm:px-8">
            <span className="mx-auto grid size-12 place-items-center rounded-xl border border-brand/20 bg-brand/8 text-brand">
              <BriefcaseBusiness className="size-5" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-xl font-semibold text-foreground">No agent tasks for this wallet yet</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
              Hire a compatible agent to create your first ERC-8183 task.
            </p>
            <Link href="/discover" className={cn(buttonVariants({ variant: "brand", size: "lg" }), "mt-6")}>
              <Search className="size-4" aria-hidden="true" />
              Discover agents
            </Link>
          </div>
        ) : visibleJobs.length === 0 ? (
          <div className="mt-7 rounded-xl border border-dashed border-border bg-card px-5 py-10 text-center">
            <h3 className="text-lg font-semibold text-foreground">No {filter} tasks</h3>
            <p className="mt-2 text-sm text-muted-foreground">No tasks match this status.</p>
            <Button type="button" variant="outline" className="mt-5" onClick={() => setFilter("all")}>Show all tasks</Button>
          </div>
        ) : (
          <div className="mt-7 grid gap-5">
            {visibleJobs.map((job) => <DashboardJobCard key={job.id} job={job} />)}
          </div>
        )}
      </section>

      <p className="mt-8 border-t border-border pt-5 text-xs leading-5 text-muted-foreground">
        Activity includes only recorded application events and verified blockchain events.
      </p>
    </>
  );
}
