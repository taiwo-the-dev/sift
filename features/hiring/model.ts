import type { Address, Hash } from "viem";

import type {
  HiringChainId,
  HiringTransactionStep,
} from "@/features/hiring/protocol";

export type HiringIntentStatus =
  | "draft"
  | "awaiting_wallet"
  | "submitted"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "replaced";

export type HiringTransactionStatus =
  | "submitted"
  | "confirmed"
  | "failed"
  | "cancelled"
  | "replaced";

export type HiringFlowStep =
  | "mission"
  | "permissions"
  | "review"
  | "wallet"
  | "confirmation";

export type HiringExecutionMode = "altana" | "wallet";

export type HiringCompatibility = Readonly<{
  endpoint: string;
  negotiateUrl: string;
  statusUrl: string;
}>;

export type HiringAgentSummary = Readonly<{
  agentId: string;
  chainId: HiringChainId;
  imageUrl: string | null;
  name: string;
  ownerAddress: Address;
  profileHref: string;
}>;

export type HiringMissionInput = Readonly<{
  deliverables: string;
  durationSeconds: number;
  maxSpend: string;
  mission: string;
  qualityStandards: string;
}>;

export type HiringQuote = Readonly<{
  budgetBaseUnits: string;
  budgetDisplay: string;
  chainId: HiringChainId;
  disputeWindowSeconds: number;
  estimatedCompletionSeconds: number | null;
  expiresAt: string;
  maximumSpendBaseUnits: string;
  maximumSpendDisplay: string;
  negotiationHash: Hash;
  onchainDescription: string;
  platformFeeBasisPoints: number;
  providerAddress: Address;
  quoteExpiresAt: string;
  signedEnvelope: Readonly<Record<string, unknown>>;
  signatureMethod: "eip191" | "erc1271";
  tokenAddress: Address;
  tokenDecimals: number;
  tokenSymbol: string;
}>;

export type HiringTransactionSnapshot = Readonly<{
  blockNumber: string | null;
  confirmedAt: string | null;
  hash: Hash;
  replacedHash: Hash | null;
  status: HiringTransactionStatus;
  step: HiringTransactionStep;
}>;

export type HiringIntentSnapshot = Readonly<{
  agentId: string;
  budgetBaseUnits: string;
  chainId: HiringChainId;
  confirmedAt: string | null;
  currentStep: HiringTransactionStep | null;
  deliverables: string;
  durationSeconds: number;
  expiresAt: string;
  failureMessage: string | null;
  id: string;
  maxSpend: string;
  mission: string;
  onchainDescription: string;
  onchainJobId: string | null;
  providerAddress: Address;
  qualityStandards: string;
  quoteExpiresAt: string;
  status: HiringIntentStatus;
  transactionHash: Hash | null;
  transactions: readonly HiringTransactionSnapshot[];
  walletAddress: Address;
}>;

export type CreateHiringIntentInput = Readonly<{
  agentId: string;
  chainId: HiringChainId;
  deliverables: string;
  durationSeconds: number;
  idempotencyKey: string;
  mainnetRiskAccepted: boolean;
  maxSpend: string;
  mission: string;
  qualityStandards: string;
  quote: HiringQuote;
  resumeToken: string;
  walletAddress: Address;
}>;
