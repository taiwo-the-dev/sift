import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

import { getAddress, type Address, type Hash } from "viem";

import type {
  CreateHiringIntentInput,
  HiringIntentSnapshot,
  HiringIntentStatus,
  HiringTransactionSnapshot,
  HiringTransactionStatus,
} from "@/features/hiring/model";
import {
  erc8183Deployment,
  transactionDestination,
  type HiringTransactionStep,
} from "@/features/hiring/protocol";
import {
  formatTokenAmount,
  hiringDurations,
} from "@/features/hiring/validation";
import { getSupabaseServerClient } from "@/lib/db/client";
import type {
  Json,
  TableInsert,
  TableRow,
  TableUpdate,
} from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";

type AgentRecord = TableRow<"agents">;
type JobRecord = TableRow<"jobs">;
type JobTransactionRecord = TableRow<"job_transactions">;

const intentStatuses: readonly HiringIntentStatus[] = [
  "draft",
  "awaiting_wallet",
  "submitted",
  "confirmed",
  "failed",
  "cancelled",
  "replaced",
];
const transactionStatuses: readonly HiringTransactionStatus[] = [
  "submitted",
  "confirmed",
  "failed",
  "cancelled",
  "replaced",
];
const transactionSteps: readonly HiringTransactionStep[] = [
  "create_job",
  "register_job",
  "set_budget",
  "approve_token",
  "fund_job",
];

export type HiringIntentRecord = JobRecord;

export class HiringAuthorizationError extends Error {
  constructor(message = "This saved hiring flow cannot be resumed.") {
    super(message);
    this.name = "HiringAuthorizationError";
  }
}

export class HiringConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HiringConflictError";
  }
}

function resumeTokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function tokenMatches(token: string, expectedHash: string): boolean {
  const actual = Buffer.from(resumeTokenHash(token), "hex");
  const expected = Buffer.from(expectedHash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function mapIntentStatus(value: string): HiringIntentStatus {
  const status = intentStatuses.find((candidate) => candidate === value);

  if (!status) {
    throw new DatabaseOperationError(
      "map hiring intent status",
      new TypeError("The database returned an unsupported hiring status."),
    );
  }

  return status;
}

function mapTransactionStatus(value: string): HiringTransactionStatus {
  const status = transactionStatuses.find((candidate) => candidate === value);

  if (!status) {
    throw new DatabaseOperationError(
      "map hiring transaction status",
      new TypeError("The database returned an unsupported transaction status."),
    );
  }

  return status;
}

function mapTransactionStep(value: string): HiringTransactionStep {
  const step = transactionSteps.find((candidate) => candidate === value);

  if (!step) {
    throw new DatabaseOperationError(
      "map hiring transaction step",
      new TypeError("The database returned an unsupported transaction step."),
    );
  }

  return step;
}

function toTransactionSnapshot(
  record: JobTransactionRecord,
): HiringTransactionSnapshot {
  return {
    blockNumber:
      record.block_number === null ? null : String(record.block_number),
    confirmedAt: record.confirmed_at,
    hash: record.transaction_hash as Hash,
    replacedHash: record.replaced_transaction_hash as Hash | null,
    status: mapTransactionStatus(record.status),
    step: mapTransactionStep(record.step),
  };
}

function inferHiringDuration(record: JobRecord): number {
  const approximateSeconds = Math.max(
    0,
    Math.round(
      (Date.parse(record.expires_at) - Date.parse(record.created_at)) / 1_000,
    ),
  );

  return hiringDurations.reduce((closest, candidate) =>
    Math.abs(candidate - approximateSeconds) <
    Math.abs(closest - approximateSeconds)
      ? candidate
      : closest,
  );
}

export function toHiringIntentSnapshot(
  record: JobRecord,
  transactions: readonly JobTransactionRecord[],
): HiringIntentSnapshot {
  return {
    agentId: record.agent_id,
    budgetBaseUnits: record.budget_base_units,
    chainId: record.chain_id,
    confirmedAt: record.confirmed_at,
    currentStep: record.current_step
      ? mapTransactionStep(record.current_step)
      : null,
    deliverables: record.deliverables,
    durationSeconds: inferHiringDuration(record),
    expiresAt: record.expires_at,
    failureMessage: record.failure_message,
    id: record.id,
    maxSpend: formatTokenAmount(
      BigInt(record.maximum_spend_base_units),
      record.payment_token_decimals,
    ),
    mission: record.mission,
    onchainDescription: record.onchain_description,
    onchainJobId: record.onchain_job_id,
    providerAddress: getAddress(record.provider_address),
    qualityStandards: record.quality_standards,
    quoteExpiresAt: record.quote_expires_at,
    status: mapIntentStatus(record.status),
    transactionHash: record.transaction_hash as Hash | null,
    transactions: transactions.map(toTransactionSnapshot),
    walletAddress: getAddress(record.wallet_address),
  };
}

function intentMatchesInput(
  record: JobRecord,
  input: CreateHiringIntentInput,
): boolean {
  return (
    record.chain_id === input.chainId &&
    record.agent_id === input.agentId &&
    record.wallet_address === input.walletAddress.toLowerCase() &&
    record.provider_address === input.quote.providerAddress.toLowerCase() &&
    record.mission === input.mission &&
    record.deliverables === input.deliverables &&
    record.quality_standards === input.qualityStandards &&
    record.onchain_description === input.quote.onchainDescription &&
    record.negotiation_hash === input.quote.negotiationHash.toLowerCase() &&
    record.maximum_spend_base_units === input.quote.maximumSpendBaseUnits &&
    record.budget_base_units === input.quote.budgetBaseUnits &&
    record.quote_expires_at === input.quote.quoteExpiresAt &&
    record.expires_at === input.quote.expiresAt
  );
}

function isUniqueViolation(error: Readonly<{ code?: string }> | null): boolean {
  return error?.code === "23505";
}

export type CreateIntentResult = Readonly<{
  created: boolean;
  record: JobRecord;
  snapshot: HiringIntentSnapshot;
}>;

export async function createHiringIntent(
  input: CreateHiringIntentInput,
): Promise<CreateIntentResult> {
  const client = getSupabaseServerClient();
  const { data: agent, error: agentError } = await client
    .from("agents")
    .select("*")
    .eq("chain_id", input.chainId)
    .eq("agent_id", input.agentId)
    .maybeSingle();

  if (agentError) {
    throw new DatabaseOperationError("resolve hiring agent", agentError);
  }

  if (!agent) {
    throw new HiringConflictError("The selected indexed agent no longer exists.");
  }

  const existingResult = await client
    .from("jobs")
    .select("*")
    .eq("idempotency_key", input.idempotencyKey)
    .maybeSingle();

  if (existingResult.error) {
    throw new DatabaseOperationError(
      "find idempotent hiring intent",
      existingResult.error,
    );
  }

  if (existingResult.data) {
    if (
      !tokenMatches(input.resumeToken, existingResult.data.resume_token_hash) ||
      !intentMatchesInput(existingResult.data, input)
    ) {
      throw new HiringConflictError(
        "The idempotency key is already bound to different hiring inputs.",
      );
    }

    const transactions = await listHiringTransactions(existingResult.data.id);
    return {
      created: false,
      record: existingResult.data,
      snapshot: toHiringIntentSnapshot(existingResult.data, transactions),
    };
  }

  const insert: TableInsert<"jobs"> = {
    agent_db_id: (agent as AgentRecord).id,
    agent_id: input.agentId,
    budget_base_units: input.quote.budgetBaseUnits,
    chain_id: input.chainId,
    commerce_address: erc8183Deployment.commerce.toLowerCase(),
    current_step: "create_job",
    deliverables: input.deliverables,
    expires_at: input.quote.expiresAt,
    idempotency_key: input.idempotencyKey,
    maximum_spend_base_units: input.quote.maximumSpendBaseUnits,
    mission: input.mission,
    negotiation_hash: input.quote.negotiationHash.toLowerCase(),
    onchain_description: input.quote.onchainDescription,
    payment_token_address: erc8183Deployment.paymentToken.toLowerCase(),
    payment_token_decimals: erc8183Deployment.tokenDecimals,
    payment_token_symbol: erc8183Deployment.tokenSymbol,
    policy_address: erc8183Deployment.policy.toLowerCase(),
    provider_address: input.quote.providerAddress.toLowerCase(),
    quality_standards: input.qualityStandards,
    quote_expires_at: input.quote.quoteExpiresAt,
    registry_address: agent.registry_address,
    resume_token_hash: resumeTokenHash(input.resumeToken),
    router_address: erc8183Deployment.router.toLowerCase(),
    status: "awaiting_wallet",
    wallet_address: input.walletAddress.toLowerCase(),
  };
  const insertedResult = await client
    .from("jobs")
    .insert(insert)
    .select("*")
    .single();

  if (insertedResult.error) {
    if (isUniqueViolation(insertedResult.error)) {
      return createHiringIntent(input);
    }

    throw new DatabaseOperationError(
      "create hiring intent",
      insertedResult.error,
    );
  }

  await insertHiringActivity(
    insertedResult.data.id,
    "intent_created",
    null,
    { status: "awaiting_wallet" },
  );

  return {
    created: true,
    record: insertedResult.data,
    snapshot: toHiringIntentSnapshot(insertedResult.data, []),
  };
}

async function listHiringTransactions(
  jobId: string,
): Promise<readonly JobTransactionRecord[]> {
  const { data, error } = await getSupabaseServerClient()
    .from("job_transactions")
    .select("*")
    .eq("job_db_id", jobId)
    .order("submitted_at", { ascending: true });

  if (error) {
    throw new DatabaseOperationError("list hiring transactions", error);
  }

  return data;
}

export async function getAuthorizedHiringIntent(
  id: string,
  resumeToken: string,
): Promise<Readonly<{ record: JobRecord; snapshot: HiringIntentSnapshot }>> {
  const { data, error } = await getSupabaseServerClient()
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new DatabaseOperationError("load hiring intent", error);
  }

  if (!data || !tokenMatches(resumeToken, data.resume_token_hash)) {
    throw new HiringAuthorizationError();
  }

  const transactions = await listHiringTransactions(id);
  return { record: data, snapshot: toHiringIntentSnapshot(data, transactions) };
}

export type VerifiedTransactionWrite = Readonly<{
  blockHash: Hash | null;
  blockNumber: bigint | null;
  confirmedAt: string | null;
  from: Address;
  hash: Hash;
  replacedHash: Hash | null;
  status: HiringTransactionStatus;
  step: HiringTransactionStep;
}>;

export async function persistVerifiedHiringTransaction(
  job: JobRecord,
  transaction: VerifiedTransactionWrite,
  jobUpdate: TableUpdate<"jobs">,
): Promise<HiringIntentSnapshot> {
  const client = getSupabaseServerClient();
  const result = await client.rpc("record_hiring_verification", {
    p_block_hash: transaction.blockHash?.toLowerCase() ?? null,
    p_block_number:
      transaction.blockNumber === null ? null : Number(transaction.blockNumber),
    p_current_step:
      jobUpdate.current_step === undefined
        ? job.current_step
        : jobUpdate.current_step,
    p_failure_code:
      jobUpdate.failure_code === undefined
        ? job.failure_code
        : jobUpdate.failure_code,
    p_failure_message:
      jobUpdate.failure_message === undefined
        ? job.failure_message
        : jobUpdate.failure_message,
    p_final_block_number:
      jobUpdate.block_number === undefined
        ? job.block_number
        : jobUpdate.block_number,
    p_final_transaction_hash:
      jobUpdate.transaction_hash === undefined
        ? job.transaction_hash
        : jobUpdate.transaction_hash,
    p_from_address: transaction.from.toLowerCase(),
    p_job_confirmed_at:
      jobUpdate.confirmed_at === undefined
        ? job.confirmed_at
        : jobUpdate.confirmed_at,
    p_job_id: job.id,
    p_job_status:
      jobUpdate.status === undefined ? job.status : jobUpdate.status,
    p_onchain_job_id:
      jobUpdate.onchain_job_id === undefined
        ? job.onchain_job_id
        : jobUpdate.onchain_job_id,
    p_replaced_transaction_hash:
      transaction.replacedHash?.toLowerCase() ?? null,
    p_step: transaction.step,
    p_to_address: transactionDestination(transaction.step).toLowerCase(),
    p_transaction_confirmed_at: transaction.confirmedAt,
    p_transaction_hash: transaction.hash.toLowerCase(),
    p_transaction_status: transaction.status,
  });

  if (result.error) {
    throw new DatabaseOperationError(
      "atomically persist verified hiring transaction",
      result.error,
    );
  }

  const transactions = await listHiringTransactions(job.id);
  const fresh = await client.from("jobs").select("*").eq("id", job.id).single();

  if (fresh.error) {
    throw new DatabaseOperationError("reload hiring intent", fresh.error);
  }

  return toHiringIntentSnapshot(fresh.data, transactions);
}

export async function updateHiringIntent(
  jobId: string,
  update: TableUpdate<"jobs">,
  activity?: Readonly<{
    details?: Json;
    transactionHash?: Hash | null;
    type:
      | "wallet_awaiting"
      | "wallet_cancelled"
      | "transaction_failed"
      | "job_confirmed";
  }>,
): Promise<JobRecord> {
  const client = getSupabaseServerClient();
  const { data, error } = await client
    .from("jobs")
    .update(update)
    .eq("id", jobId)
    .select("*")
    .single();

  if (error) {
    throw new DatabaseOperationError("update hiring intent", error);
  }

  if (activity) {
    await insertHiringActivity(
      jobId,
      activity.type,
      activity.transactionHash ?? null,
      activity.details ?? {},
    );
  }

  return data;
}

async function insertHiringActivity(
  jobId: string,
  type: TableInsert<"job_activity">["activity_type"],
  transactionHash: Hash | null,
  details: Json,
): Promise<void> {
  const { error } = await getSupabaseServerClient()
    .from("job_activity")
    .insert({
      activity_type: type,
      details,
      job_db_id: jobId,
      transaction_hash: transactionHash?.toLowerCase() ?? null,
    });

  if (error && !isUniqueViolation(error)) {
    throw new DatabaseOperationError("append hiring activity", error);
  }
}
