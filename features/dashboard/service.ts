import "server-only";

import { getAddress, type Address } from "viem";

import {
  classifyDashboardJob,
  dashboardStatusLabel,
  mapProtocolJobStatus,
  orderDashboardActivity,
  summarizeDashboardJobs,
} from "@/features/dashboard/derive";
import type {
  DashboardActivity,
  DashboardActivitySource,
  DashboardJob,
  DashboardProtocolStatus,
  DashboardSnapshot,
} from "@/features/dashboard/model";
import { buildAgentProfileHref } from "@/features/agents/route";
import {
  commerceAbi,
  HIRING_NETWORK_NAME,
} from "@/features/hiring/protocol";
import { formatTokenAmount } from "@/features/hiring/validation";
import { getHiringPublicClient } from "@/lib/blockchain/hiring-client";
import {
  createDashboardRepository,
  type DashboardDatabaseJob,
} from "@/lib/db/dashboard-repository";
import type { Json } from "@/lib/db/database.types";

type ProtocolObservation = Readonly<{
  observedAt: string;
  status: DashboardProtocolStatus;
  verified: boolean;
}>;

function detailStep(details: Json): string | null {
  if (
    typeof details === "object" &&
    details !== null &&
    !Array.isArray(details) &&
    typeof details.step === "string"
  ) {
    return details.step.replaceAll("_", " ");
  }
  return null;
}

function activityPresentation(type: string, details: Json): Readonly<{
  description: string;
  source: DashboardActivitySource;
  title: string;
}> {
  const step = detailStep(details);
  const presentations: Readonly<Record<string, Readonly<{
    description: string;
    source: DashboardActivitySource;
    title: string;
  }>>> = {
    intent_created: {
      description: "Task requirements were saved in Sift. No blockchain transaction has happened yet.",
      source: "application",
      title: "Hiring request saved",
    },
    job_confirmed: {
      description: "The funding transaction and ERC-8183 job state were verified.",
      source: "onchain",
      title: "Job funding confirmed",
    },
    transaction_confirmed: {
      description: `${step ?? "Hiring"} transaction receipt was verified on BSC Testnet.`,
      source: "onchain",
      title: "Transaction confirmed",
    },
    transaction_failed: {
      description: `${step ?? "Hiring"} transaction was observed as failed.`,
      source: "onchain",
      title: "Transaction failed",
    },
    transaction_replaced: {
      description: `${step ?? "Hiring"} transaction was replaced before final confirmation.`,
      source: "indexed-observation",
      title: "Transaction replaced",
    },
    transaction_submitted: {
      description: `${step ?? "Hiring"} transaction hash was recorded while confirmation was pending.`,
      source: "application",
      title: "Transaction submitted",
    },
    wallet_awaiting: {
      description: "Sift recorded that explicit wallet confirmation was required.",
      source: "application",
      title: "Wallet confirmation requested",
    },
    wallet_cancelled: {
      description: "The wallet step was cancelled before Sift recorded confirmation.",
      source: "application",
      title: "Wallet step cancelled",
    },
  };

  return presentations[type] ?? {
    description: "Sift saved an update for this agent task.",
    source: "application",
    title: "Recorded activity",
  };
}

function mapActivity(record: DashboardDatabaseJob["activities"][number]): DashboardActivity {
  const presentation = activityPresentation(record.activity_type, record.details);
  return {
    description: presentation.description,
    id: String(record.id),
    occurredAt: record.occurred_at,
    source: presentation.source,
    title: presentation.title,
    transactionHash: record.transaction_hash,
  };
}

async function observeProtocolJob(
  record: DashboardDatabaseJob,
  observedAt: string,
): Promise<ProtocolObservation> {
  if (!record.job.onchain_job_id) {
    return { observedAt, status: "unknown", verified: false };
  }

  const onchain = await getHiringPublicClient().readContract({
    abi: commerceAbi,
    address: getAddress(record.job.commerce_address),
    args: [BigInt(record.job.onchain_job_id)],
    functionName: "getJob",
  });

  if (
    onchain.id !== BigInt(record.job.onchain_job_id) ||
    getAddress(onchain.client) !== getAddress(record.job.wallet_address) ||
    getAddress(onchain.provider) !== getAddress(record.job.provider_address)
  ) {
    throw new Error("The blockchain job does not match the saved owner and provider wallets.");
  }

  return {
    observedAt,
    status: mapProtocolJobStatus(Number(onchain.status)),
    verified: true,
  };
}

export async function getWalletDashboard(
  walletAddress: Address,
): Promise<DashboardSnapshot> {
  const records = await createDashboardRepository().listWalletJobs(walletAddress);
  const observedAt = new Date().toISOString();
  const observations = await Promise.allSettled(
    records.map((record) => observeProtocolJob(record, observedAt)),
  );
  let partial = false;

  const jobs = records.map((record, index) => {
    const observationResult = observations[index];
    const hasOnchainJob = record.job.onchain_job_id !== null;
    const observation =
      observationResult?.status === "fulfilled"
        ? observationResult.value
        : { observedAt, status: "unknown" as const, verified: false };
    if (hasOnchainJob && !observation.verified) partial = true;

    const category = classifyDashboardJob({
      persistedStatus: record.job.status,
      protocolStatus: observation.status,
    });
    const name = record.agent?.name?.trim() || `Agent #${record.job.agent_id}`;
    const healthStatus: DashboardJob["agent"]["healthStatus"] =
      record.health?.status === "online" || record.health?.status === "offline"
        ? record.health.status
        : "unknown";

    return {
      activities: orderDashboardActivity(record.activities.map(mapActivity)),
      agent: {
        agentId: record.job.agent_id,
        chainId: record.job.chain_id,
        healthCheckedAt: record.health?.last_checked_at ?? null,
        healthStatus,
        imageUrl: record.agent?.image_url ?? null,
        name,
        profileHref:
          buildAgentProfileHref(record.job.chain_id, record.job.agent_id) ??
          "/agents/profile-not-found",
      },
      budgetDisplay: formatTokenAmount(
        BigInt(record.job.budget_base_units),
        record.job.payment_token_decimals,
      ),
      category,
      confirmedAt: record.job.confirmed_at,
      createdAt: record.job.created_at,
      currentStep: record.job.current_step,
      deliverables: record.job.deliverables,
      expiresAt: record.job.expires_at,
      failureMessage: record.job.failure_message,
      id: record.job.id,
      maximumSpendDisplay: formatTokenAmount(
        BigInt(record.job.maximum_spend_base_units),
        record.job.payment_token_decimals,
      ),
      mission: record.job.mission,
      networkName: HIRING_NETWORK_NAME,
      onchainJobId: record.job.onchain_job_id,
      paymentTokenSymbol: record.job.payment_token_symbol,
      protocolObservedAt: observation.verified ? observation.observedAt : null,
      protocolStatus: observation.status,
      protocolVerification: hasOnchainJob
        ? observation.verified
          ? "verified" as const
          : "unavailable" as const
        : "not-applicable" as const,
      qualityStandards: record.job.quality_standards,
      statusLabel: dashboardStatusLabel({
        category,
        persistedStatus: record.job.status,
        protocolStatus: observation.status,
      }),
      transactionHash: record.job.transaction_hash,
      transactions: record.transactions.map((transaction) => ({
        blockNumber:
          transaction.block_number === null
            ? null
            : String(transaction.block_number),
        confirmedAt: transaction.confirmed_at,
        hash: transaction.transaction_hash,
        status: transaction.status,
        step: transaction.step,
        submittedAt: transaction.submitted_at,
      })),
    };
  });

  return {
    jobs,
    observedAt,
    partial,
    summary: summarizeDashboardJobs(jobs),
    walletAddress: getAddress(walletAddress),
  };
}
