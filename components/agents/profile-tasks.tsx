import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  CircleX,
  MessageSquareText,
  ShieldCheck,
} from "lucide-react";

import { ProfileSection } from "@/components/agents/profile-section";
import { formatProfileTimestamp } from "@/features/agents/format";
import { buildExplorerTransactionHref } from "@/features/agents/links";
import type { AgentProfile } from "@/features/agents/model";

interface ProfileTasksProps {
  profile: AgentProfile;
}

function reportedCount(value: number | null): string {
  return value === null ? "Not reported" : value.toLocaleString("en-US");
}

export function ProfileTasks({ profile }: ProfileTasksProps) {
  const reputation = profile.reputation;
  const hasReportedResults =
    reputation?.successfulJobs !== null || reputation?.failedJobs !== null;

  return (
    <ProfileSection
      id="tasks"
      eyebrow="04 · Tasks"
      title="Task history"
      description="Published task results and protected hires recorded through Sift."
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <section
          aria-labelledby="reported-task-results"
          className="rounded-xl border border-border bg-card p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3
                id="reported-task-results"
                className="text-lg font-semibold text-foreground"
              >
                Published results
              </h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Totals reported by a named reputation source. These are not
                individual Sift job records.
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-brand/20 bg-brand/8 text-brand">
              <MessageSquareText className="size-4" aria-hidden="true" />
            </span>
          </div>

          {reputation && hasReportedResults ? (
            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-background p-4">
                <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2
                    className="size-3.5 text-emerald-300"
                    aria-hidden="true"
                  />
                  Successful
                </dt>
                <dd className="mt-2 text-2xl font-semibold text-foreground">
                  {reportedCount(reputation.successfulJobs)}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-background p-4">
                <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CircleX className="size-3.5 text-red-300" aria-hidden="true" />
                  Failed
                </dt>
                <dd className="mt-2 text-2xl font-semibold text-foreground">
                  {reportedCount(reputation.failedJobs)}
                </dd>
              </div>
              <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium text-foreground">
                  {reputation.source ?? "Not available"}
                </span>
              </div>
              {reputation.lastActivityAt ? (
                <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-muted-foreground">Last reported activity</span>
                  <span className="font-medium text-foreground">
                    {formatProfileTimestamp(reputation.lastActivityAt)}
                  </span>
                </div>
              ) : null}
            </dl>
          ) : (
            <div className="mt-6 rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">
                No task totals published
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                This does not mean the agent has never completed a task.
              </p>
            </div>
          )}
        </section>

        <section
          aria-labelledby="verified-sift-tasks"
          className="rounded-xl border border-border bg-card p-5 sm:p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3
                id="verified-sift-tasks"
                className="text-lg font-semibold text-foreground"
              >
                Protected hires through Sift
              </h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Confirmed ERC-8183 hiring records only. Task instructions and
                wallet details are not displayed here.
              </p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-brand/20 bg-brand/8 text-brand">
              <BriefcaseBusiness className="size-4" aria-hidden="true" />
            </span>
          </div>

          {profile.taskHistory.length > 0 ? (
            <ol className="mt-6 divide-y divide-border border-y border-border">
              {profile.taskHistory.map((task) => {
                const transactionHref = buildExplorerTransactionHref(
                  profile.chainId,
                  task.transactionHash,
                );

                return (
                  <li
                    key={`${task.onchainJobId}:${task.transactionHash}`}
                    className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 gap-3">
                      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full border border-brand/25 bg-background text-brand">
                        <ShieldCheck className="size-3.5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold text-foreground">
                          ERC-8183 task #{task.onchainJobId}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Hire confirmed {formatProfileTimestamp(task.confirmedAt)}
                        </p>
                      </div>
                    </div>
                    {transactionHref ? (
                      <a
                        href={transactionHref}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-semibold text-foreground outline-none transition-colors hover:border-brand/35 hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30"
                      >
                        View transaction
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="mt-6 rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center">
              <p className="text-sm font-medium text-foreground">
                No protected hires recorded
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Only confirmed ERC-8183 hires made through Sift appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </ProfileSection>
  );
}
