import {
  Activity,
  ArrowUpRight,
  Bot,
  CalendarClock,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleX,
  FileCheck2,
  RadioTower,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

import { AgentAvatar } from "@/components/discovery/agent-avatar";
import type { DashboardJob } from "@/features/dashboard/model";
import {
  dashboardActivitySourceLabel,
  dashboardTransactionHref,
  formatDashboardStep,
  formatDashboardTimestamp,
} from "@/features/dashboard/presentation";
import { cn } from "@/lib/utils";

const categoryStyles = {
  active: "border-emerald-400/25 bg-emerald-400/8 text-emerald-300",
  completed: "border-sky-400/25 bg-sky-400/8 text-sky-300",
  failed: "border-destructive/30 bg-destructive/8 text-red-300",
  pending: "border-amber-400/25 bg-amber-400/8 text-amber-200",
} as const;

const categoryIcons = {
  active: RadioTower,
  completed: CircleCheck,
  failed: CircleX,
  pending: CircleDashed,
} as const;

function Identifier({ label, value }: Readonly<{ label: string; value: string | null }>) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-all font-mono text-xs text-foreground">
        {value ?? "Not available"}
      </dd>
    </div>
  );
}

const jobStages = ["Created", "Funded", "Submitted", "Completed"] as const;

function completedStageCount(job: DashboardJob): number {
  if (job.protocolStatus === "completed") return 4;
  if (job.protocolStatus === "submitted") return 3;
  if (job.protocolStatus === "funded") return 2;
  if (job.protocolStatus === "open") return 1;
  return job.onchainJobId ? 1 : 0;
}

export function DashboardJobCard({ job }: Readonly<{ job: DashboardJob }>) {
  const StatusIcon = categoryIcons[job.category];
  const finalTransactionHref = dashboardTransactionHref(
    job.transactionHash,
    job.agent.chainId,
  );
  const stageCount = completedStageCount(job);

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card shadow-sm shadow-black/10">
      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
        <div className="flex min-w-0 gap-4">
          <AgentAvatar
            agentId={job.agent.agentId}
            imageUrl={job.agent.imageUrl}
            name={job.agent.name}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                  categoryStyles[job.category],
                )}
              >
                <StatusIcon className="size-3.5" aria-hidden="true" />
                {job.statusLabel}
              </span>
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
                {job.networkName}
              </span>
            </div>
            <Link
              href={job.agent.profileHref}
              className="mt-3 inline-flex rounded-sm text-lg font-semibold text-foreground outline-none hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              {job.agent.name}
            </Link>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {job.mission}
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg border border-border bg-background p-4 text-sm lg:min-w-64">
          <div>
            <dt className="text-xs text-muted-foreground">Started</dt>
            <dd className="mt-1 font-medium text-foreground">
              {formatDashboardTimestamp(job.confirmedAt ?? job.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Expires</dt>
            <dd className="mt-1 font-medium text-foreground">
              {formatDashboardTimestamp(job.expiresAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Agent health</dt>
            <dd className="mt-1 font-medium text-foreground">
              {job.agent.healthStatus === "unknown"
                ? job.agent.healthCheckedAt
                  ? "Couldn’t verify"
                  : "Not checked yet"
                : `${job.agent.healthStatus.charAt(0).toUpperCase()}${job.agent.healthStatus.slice(1)}`}
            </dd>
            <p className="mt-1 text-[0.7rem] text-muted-foreground">
              {job.agent.healthCheckedAt
                ? `Checked ${formatDashboardTimestamp(job.agent.healthCheckedAt)}`
                : "No recent health check"}
            </p>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Activity</dt>
            <dd className="mt-1 font-medium text-foreground">
              {job.activities.length} recorded
            </dd>
          </div>
        </dl>
      </div>

      <div className="border-t border-border px-5 py-4 sm:px-6">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Job progress
        </p>
        <ol className="mt-3 grid grid-cols-4 gap-2" aria-label={`Job progress: ${job.statusLabel}`}>
          {jobStages.map((stage, index) => {
            const reached = index < stageCount;
            return (
              <li key={stage} className="min-w-0">
                <span className={cn("block h-1.5 rounded-full", reached ? "bg-brand" : "bg-secondary")} aria-hidden="true" />
                <span className={cn("mt-2 block truncate text-[0.68rem] font-medium", reached ? "text-foreground" : "text-muted-foreground")}>{stage}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <details className="group border-t border-border">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 text-sm font-semibold text-foreground outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/30 sm:px-6 [&::-webkit-details-marker]:hidden">
          View task and transaction details
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>

        <div className="grid border-t border-border lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div className="space-y-7 p-5 sm:p-6 lg:border-r lg:border-border">
            <section aria-labelledby={`mission-${job.id}`}>
              <h3 id={`mission-${job.id}`} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <FileCheck2 className="size-4 text-brand" aria-hidden="true" />
                Reviewed task
              </h3>
              <dl className="mt-4 grid gap-4 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Deliverables</dt>
                  <dd className="mt-1.5 leading-6 text-foreground">{job.deliverables}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Quality standards</dt>
                  <dd className="mt-1.5 leading-6 text-foreground">{job.qualityStandards}</dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby={`permissions-${job.id}`}>
              <h3 id={`permissions-${job.id}`} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="size-4 text-brand" aria-hidden="true" />
                Permissions and limits
              </h3>
              <dl className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-border bg-background p-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Maximum spend</dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {job.maximumSpendDisplay} {job.paymentTokenSymbol}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Quoted budget</dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {job.budgetDisplay} {job.paymentTokenSymbol}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Current wallet step</dt>
                  <dd className="mt-1 font-medium text-foreground">
                    {formatDashboardStep(job.currentStep)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Blockchain status</dt>
                  <dd className="mt-1 font-medium capitalize text-foreground">
                    {job.protocolStatus === "unknown" ? "Unavailable" : job.protocolStatus}
                  </dd>
                </div>
              </dl>
            </section>

            <section aria-labelledby={`evidence-${job.id}`}>
              <h3 id={`evidence-${job.id}`} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Bot className="size-4 text-brand" aria-hidden="true" />
                IDs and transaction data
              </h3>
              <dl className="mt-4 grid gap-4 rounded-lg border border-border bg-background p-4 sm:grid-cols-2">
                <Identifier label="Sift task record" value={job.id} />
                <Identifier label="ERC-8183 job ID" value={job.onchainJobId} />
                <Identifier label="Agent ID" value={`${job.agent.chainId}:${job.agent.agentId}`} />
                <Identifier label="Final transaction" value={job.transactionHash} />
              </dl>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                {finalTransactionHref ? (
                  <a
                    href={finalTransactionHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1.5 font-semibold text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    View final transaction
                    <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  </a>
                ) : null}
                <span className="text-muted-foreground">
                  {job.protocolVerification === "verified"
                    ? `Blockchain status checked ${formatDashboardTimestamp(job.protocolObservedAt)}`
                    : job.protocolVerification === "unavailable"
                      ? "Current blockchain status could not be refreshed; saved transaction data is shown."
                      : "No blockchain job ID has been confirmed yet."}
                </span>
              </div>
              {job.failureMessage ? (
                <p className="mt-3 rounded-lg border border-destructive/25 bg-destructive/8 p-3 text-xs leading-5 text-red-200">
                  {job.failureMessage}
                </p>
              ) : null}
            </section>
          </div>

          <section className="p-5 sm:p-6" aria-labelledby={`activity-${job.id}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id={`activity-${job.id}`} className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Activity className="size-4 text-brand" aria-hidden="true" />
                  Activity and audit trail
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Newest first. Each entry shows whether it came from Sift or the blockchain.
                </p>
              </div>
            </div>

            {job.activities.length > 0 ? (
              <ol className="mt-5 space-y-0">
                {job.activities.map((activity, index) => {
                  const transactionHref = dashboardTransactionHref(
                    activity.transactionHash,
                    job.agent.chainId,
                  );
                  return (
                    <li key={activity.id} className="relative grid grid-cols-[1rem_minmax(0,1fr)] gap-3 pb-5 last:pb-0">
                      {index < job.activities.length - 1 ? (
                        <span aria-hidden="true" className="absolute left-[0.4375rem] top-4 h-full w-px bg-border" />
                      ) : null}
                      <span aria-hidden="true" className="relative mt-1.5 size-3 rounded-full border-2 border-brand bg-background" />
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground">{activity.title}</p>
                          <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[0.65rem] font-medium text-muted-foreground">
                            {dashboardActivitySourceLabel(activity.source)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">{activity.description}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[0.7rem] text-muted-foreground">
                          <time dateTime={activity.occurredAt}>{formatDashboardTimestamp(activity.occurredAt)}</time>
                          {transactionHref ? (
                            <a href={transactionHref} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-semibold text-brand outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/30">
                              Transaction
                              <ArrowUpRight className="size-3" aria-hidden="true" />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="mt-5 rounded-lg border border-dashed border-border bg-background p-6 text-center">
                <CalendarClock className="mx-auto size-5 text-muted-foreground" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium text-foreground">No activity recorded</p>
              </div>
            )}
          </section>
        </div>
      </details>
    </article>
  );
}
