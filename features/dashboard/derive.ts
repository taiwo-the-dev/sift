import type {
  DashboardActivity,
  DashboardJob,
  DashboardJobCategory,
  DashboardProtocolStatus,
  DashboardSummary,
} from "@/features/dashboard/model";

export function mapProtocolJobStatus(code: number): DashboardProtocolStatus {
  const statuses: readonly DashboardProtocolStatus[] = [
    "open",
    "funded",
    "submitted",
    "completed",
    "rejected",
    "expired",
  ];
  return statuses[code] ?? "unknown";
}

export function classifyDashboardJob(input: Readonly<{
  persistedStatus: string;
  protocolStatus: DashboardProtocolStatus;
}>): DashboardJobCategory {
  if (input.protocolStatus === "completed") return "completed";
  if (
    input.protocolStatus === "rejected" ||
    input.protocolStatus === "expired"
  ) {
    return "failed";
  }
  if (
    input.protocolStatus === "funded" ||
    input.protocolStatus === "submitted"
  ) {
    return "active";
  }
  if (input.protocolStatus === "open") return "pending";
  if (
    input.persistedStatus === "failed" ||
    input.persistedStatus === "cancelled"
  ) {
    return "failed";
  }
  if (
    input.persistedStatus === "confirmed" &&
    input.protocolStatus === "unknown"
  ) {
    return "active";
  }
  return "pending";
}

export function dashboardStatusLabel(input: Readonly<{
  category: DashboardJobCategory;
  persistedStatus: string;
  protocolStatus: DashboardProtocolStatus;
}>): string {
  if (input.protocolStatus === "completed") return "Completed on-chain";
  if (input.protocolStatus === "rejected") return "Rejected on-chain";
  if (input.protocolStatus === "expired") return "Expired on-chain";
  if (input.protocolStatus === "submitted") return "Work submitted";
  if (input.protocolStatus === "funded") return "Funded · awaiting delivery";
  if (input.protocolStatus === "open") return "Created · funding pending";
  if (input.persistedStatus === "awaiting_wallet") return "Awaiting wallet";
  if (input.persistedStatus === "submitted") return "Transaction pending";
  if (input.persistedStatus === "replaced") return "Transaction replaced";
  if (input.persistedStatus === "cancelled") return "Cancelled before confirmation";
  if (input.persistedStatus === "failed") return "Transaction failed";
  if (input.category === "active") return "Funding confirmed";
  return "Status unavailable";
}

export function orderDashboardActivity(
  activities: readonly DashboardActivity[],
): readonly DashboardActivity[] {
  return [...activities].sort((left, right) => {
    const timeDifference = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
    return timeDifference || right.id.localeCompare(left.id);
  });
}

export function summarizeDashboardJobs(
  jobs: readonly DashboardJob[],
): DashboardSummary {
  return jobs.reduce<DashboardSummary>(
    (summary, job) => ({
      active: summary.active + Number(job.category === "active"),
      completed: summary.completed + Number(job.category === "completed"),
      pending: summary.pending + Number(job.category === "pending"),
      totalActivity: summary.totalActivity + job.activities.length,
    }),
    { active: 0, completed: 0, pending: 0, totalActivity: 0 },
  );
}

export function shouldPollDashboard(jobs: readonly DashboardJob[]): boolean {
  return jobs.some(
    (job) => job.category === "active" || job.category === "pending",
  );
}

export function isDashboardObservationStale(
  observedAt: string,
  nowMilliseconds: number = Date.now(),
  staleAfterMilliseconds = 60_000,
): boolean {
  const value = Date.parse(observedAt);
  return !Number.isFinite(value) || nowMilliseconds - value > staleAfterMilliseconds;
}
