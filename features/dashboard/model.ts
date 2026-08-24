export const dashboardFilters = [
  "all",
  "active",
  "pending",
  "completed",
  "failed",
] as const;

export type DashboardFilter = (typeof dashboardFilters)[number];
export type DashboardJobCategory = Exclude<DashboardFilter, "all">;
export type DashboardProtocolStatus =
  | "open"
  | "funded"
  | "submitted"
  | "completed"
  | "rejected"
  | "expired"
  | "unknown";
export type DashboardActivitySource =
  | "application"
  | "onchain"
  | "indexed-observation";

export type DashboardActivity = Readonly<{
  description: string;
  id: string;
  occurredAt: string;
  source: DashboardActivitySource;
  title: string;
  transactionHash: string | null;
}>;

export type DashboardTransaction = Readonly<{
  blockNumber: string | null;
  confirmedAt: string | null;
  hash: string;
  status: string;
  step: string;
  submittedAt: string;
}>;

export type DashboardJob = Readonly<{
  activities: readonly DashboardActivity[];
  agent: Readonly<{
    agentId: string;
    chainId: number;
    healthCheckedAt: string | null;
    healthStatus: "online" | "offline" | "unknown";
    imageUrl: string | null;
    name: string;
    profileHref: string;
  }>;
  budgetDisplay: string;
  category: DashboardJobCategory;
  confirmedAt: string | null;
  createdAt: string;
  currentStep: string | null;
  deliverables: string;
  expiresAt: string;
  failureMessage: string | null;
  id: string;
  maximumSpendDisplay: string;
  mission: string;
  networkName: string;
  onchainJobId: string | null;
  paymentTokenSymbol: string;
  protocolObservedAt: string | null;
  protocolStatus: DashboardProtocolStatus;
  protocolVerification: "not-applicable" | "unavailable" | "verified";
  qualityStandards: string;
  statusLabel: string;
  transactionHash: string | null;
  transactions: readonly DashboardTransaction[];
}>;

export type DashboardSummary = Readonly<{
  active: number;
  completed: number;
  pending: number;
  totalActivity: number;
}>;

export type DashboardSnapshot = Readonly<{
  jobs: readonly DashboardJob[];
  observedAt: string;
  partial: boolean;
  summary: DashboardSummary;
  walletAddress: string;
}>;

