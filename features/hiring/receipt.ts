import {
  decodeEventLog,
  decodeFunctionData,
  getAddress,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";

import {
  commerceAbi,
  emptyBytes,
  evaluatorRouterAbi,
  getErc8183Deployment,
  HIRING_CONFIRMATIONS,
  isHiringChainId,
  paymentTokenAbi,
  transactionDestination,
  type Erc8183Deployment,
  type HiringTransactionStep,
} from "@/features/hiring/protocol";
import type { HiringIntentRecord } from "@/lib/db/hiring-repository";

export class HiringTransactionVerificationError extends Error {
  constructor(
    readonly code:
      | "chain-unavailable"
      | "invalid-transaction"
      | "quote-expired"
      | "receipt-failed",
    message: string,
  ) {
    super(message);
    this.name = "HiringTransactionVerificationError";
  }
}

export type VerifiedHiringTransaction = Readonly<{
  blockHash: Hash | null;
  blockNumber: bigint | null;
  confirmedAt: string | null;
  from: Address;
  hash: Hash;
  onchainJobId: string | null;
  replacedHash: Hash | null;
  status: "submitted" | "confirmed" | "failed" | "replaced";
  step: HiringTransactionStep;
}>;

function unixSeconds(isoTimestamp: string): bigint {
  const milliseconds = new Date(isoTimestamp).getTime();

  if (!Number.isFinite(milliseconds)) {
    throw new HiringTransactionVerificationError(
      "invalid-transaction",
      "The saved hiring expiry time is invalid.",
    );
  }

  return BigInt(Math.floor(milliseconds / 1_000));
}

function expectArgs(
  condition: boolean,
  message = "The wallet transaction does not match the reviewed hiring action.",
): void {
  if (!condition) {
    throw new HiringTransactionVerificationError(
      "invalid-transaction",
      message,
    );
  }
}

function deploymentForJob(job: HiringIntentRecord): Erc8183Deployment {
  if (!isHiringChainId(job.chain_id)) {
    throw new HiringTransactionVerificationError(
      "chain-unavailable",
      "The saved hiring request uses an unsupported network.",
    );
  }

  const deployment = getErc8183Deployment(job.chain_id);

  expectArgs(
    getAddress(job.commerce_address) === deployment.commerce &&
      getAddress(job.router_address) === deployment.router &&
      getAddress(job.policy_address) === deployment.policy &&
      getAddress(job.payment_token_address) === deployment.paymentToken &&
      job.payment_token_decimals === deployment.tokenDecimals &&
      job.payment_token_symbol === deployment.tokenSymbol,
    "The saved hiring deployment no longer matches Sift's verified network configuration.",
  );

  return deployment;
}

function verifyTransactionInput(
  job: HiringIntentRecord,
  step: HiringTransactionStep,
  input: Hex,
): void {
  const deployment = deploymentForJob(job);
  const budget = BigInt(job.budget_base_units);
  const onchainJobId = job.onchain_job_id
    ? BigInt(job.onchain_job_id)
    : null;

  if (step === "create_job") {
    const decoded = decodeFunctionData({ abi: commerceAbi, data: input });
    const args = decoded.args;

    expectArgs(
      decoded.functionName === "createJob" &&
        args?.length === 5 &&
        getAddress(String(args[0])) === getAddress(job.provider_address) &&
        getAddress(String(args[1])) === deployment.router &&
        args[2] === unixSeconds(job.expires_at) &&
        args[3] === job.onchain_description &&
        getAddress(String(args[4])) === deployment.router,
    );
    return;
  }

  expectArgs(onchainJobId !== null, "The on-chain job identifier is not available yet.");

  if (step === "register_job") {
    const decoded = decodeFunctionData({ abi: evaluatorRouterAbi, data: input });
    expectArgs(
      decoded.functionName === "registerJob" &&
        decoded.args?.[0] === onchainJobId &&
        getAddress(String(decoded.args[1])) === deployment.policy,
    );
    return;
  }

  if (step === "approve_token") {
    const decoded = decodeFunctionData({ abi: paymentTokenAbi, data: input });
    expectArgs(
      budget > 0n &&
        decoded.functionName === "approve" &&
        getAddress(String(decoded.args?.[0])) === deployment.commerce &&
        decoded.args?.[1] === budget,
    );
    return;
  }

  const decoded = decodeFunctionData({ abi: commerceAbi, data: input });

  if (step === "set_budget") {
    expectArgs(
      decoded.functionName === "setBudget" &&
        decoded.args?.[0] === onchainJobId &&
        decoded.args[1] === budget &&
        decoded.args[2] === emptyBytes,
    );
    return;
  }

  expectArgs(
    decoded.functionName === "fund" &&
      decoded.args?.[0] === onchainJobId &&
      decoded.args[1] === budget &&
      decoded.args[2] === emptyBytes,
  );
}

function findCreatedJobId(
  receipt: TransactionReceipt,
  job: HiringIntentRecord,
): bigint {
  const deployment = deploymentForJob(job);

  for (const log of receipt.logs) {
    if (getAddress(log.address) !== deployment.commerce) {
      continue;
    }

    try {
      const decoded = decodeEventLog({
        abi: commerceAbi,
        data: log.data,
        topics: log.topics,
      });

      if (
        decoded.eventName === "JobCreated" &&
        getAddress(decoded.args.client) === getAddress(job.wallet_address) &&
        getAddress(decoded.args.provider) === getAddress(job.provider_address) &&
        getAddress(decoded.args.evaluator) === deployment.router &&
        getAddress(decoded.args.hook) === deployment.router &&
        decoded.args.expiredAt === unixSeconds(job.expires_at)
      ) {
        return decoded.args.jobId;
      }
    } catch {
      // Ignore unrelated logs from the transaction receipt.
    }
  }

  throw new HiringTransactionVerificationError(
    "invalid-transaction",
    "The confirmed transaction did not emit the expected ERC-8183 JobCreated event.",
  );
}

function verifyStepEvent(
  receipt: TransactionReceipt,
  job: HiringIntentRecord,
  step: Exclude<HiringTransactionStep, "create_job">,
): void {
  const deployment = deploymentForJob(job);
  const expectedAddress = transactionDestination(step, deployment.chainId);
  const expectedJobId = job.onchain_job_id ? BigInt(job.onchain_job_id) : null;
  const budget = BigInt(job.budget_base_units);

  expectArgs(expectedJobId !== null, "The confirmed step has no verified job identifier.");

  for (const log of receipt.logs) {
    if (getAddress(log.address) !== expectedAddress) continue;

    try {
      if (step === "register_job") {
        const decoded = decodeEventLog({
          abi: evaluatorRouterAbi,
          data: log.data,
          topics: log.topics,
        });

        if (
          decoded.eventName === "JobRegistered" &&
          decoded.args.jobId === expectedJobId &&
          getAddress(decoded.args.policy) === deployment.policy &&
          getAddress(decoded.args.client) === getAddress(job.wallet_address)
        ) {
          return;
        }
      } else if (step === "approve_token") {
        const decoded = decodeEventLog({
          abi: paymentTokenAbi,
          data: log.data,
          topics: log.topics,
        });

        if (
          decoded.eventName === "Approval" &&
          getAddress(decoded.args.owner) === getAddress(job.wallet_address) &&
          getAddress(decoded.args.spender) === deployment.commerce &&
          decoded.args.value === budget
        ) {
          return;
        }
      } else {
        const decoded = decodeEventLog({
          abi: commerceAbi,
          data: log.data,
          topics: log.topics,
        });

        if (
          step === "set_budget" &&
          decoded.eventName === "BudgetSet" &&
          decoded.args.jobId === expectedJobId &&
          decoded.args.amount === budget
        ) {
          return;
        }

        if (
          step === "fund_job" &&
          decoded.eventName === "JobFunded" &&
          decoded.args.jobId === expectedJobId &&
          getAddress(decoded.args.client) === getAddress(job.wallet_address) &&
          getAddress(decoded.args.provider) === getAddress(job.provider_address) &&
          decoded.args.amount === budget
        ) {
          return;
        }
      }
    } catch {
      // Ignore unrelated logs emitted by the destination contract.
    }
  }

  throw new HiringTransactionVerificationError(
    "invalid-transaction",
    "The receipt does not contain the expected event for this hiring action.",
  );
}

async function verifyFundedJob(
  client: PublicClient,
  job: HiringIntentRecord,
  blockNumber: bigint,
): Promise<void> {
  const deployment = deploymentForJob(job);

  if (!job.onchain_job_id) {
    throw new HiringTransactionVerificationError(
      "invalid-transaction",
      "The funded job has no verified on-chain identifier.",
    );
  }

  const onchain = await client.readContract({
    address: deployment.commerce,
    abi: commerceAbi,
    functionName: "getJob",
    args: [BigInt(job.onchain_job_id)],
    blockNumber,
  });
  const status = Number(onchain.status);

  expectArgs(
    onchain.id === BigInt(job.onchain_job_id) &&
      getAddress(onchain.client) === getAddress(job.wallet_address) &&
      getAddress(onchain.provider) === getAddress(job.provider_address) &&
      getAddress(onchain.evaluator) === deployment.router &&
      onchain.description === job.onchain_description &&
      onchain.budget === BigInt(job.budget_base_units) &&
      onchain.expiredAt === unixSeconds(job.expires_at) &&
      getAddress(onchain.hook) === deployment.router &&
      status === 1,
    "The verified receipt does not map to the reviewed ERC-8183 job state.",
  );
}

export async function inspectHiringTransaction(
  input: Readonly<{
    client: PublicClient;
    hash: Hash;
    job: HiringIntentRecord;
    replacedHash?: Hash | null;
    step: HiringTransactionStep;
  }>,
): Promise<VerifiedHiringTransaction> {
  const deployment = deploymentForJob(input.job);
  const chainId = await input.client.getChainId();

  if (chainId !== deployment.chainId) {
    throw new HiringTransactionVerificationError(
      "chain-unavailable",
      `The receipt verifier is not connected to ${deployment.networkName}.`,
    );
  }

  const transaction = await input.client.getTransaction({ hash: input.hash });

  expectArgs(
    transaction.to !== null &&
      getAddress(transaction.from) === getAddress(input.job.wallet_address) &&
      getAddress(transaction.to) ===
        transactionDestination(input.step, deployment.chainId) &&
      transaction.value === 0n,
  );
  verifyTransactionInput(input.job, input.step, transaction.input);

  const quoteExpiry = unixSeconds(input.job.quote_expires_at);

  let receipt: TransactionReceipt;

  try {
    receipt = await input.client.getTransactionReceipt({ hash: input.hash });
  } catch {
    const latestBlock = await input.client.getBlock();

    if (latestBlock.timestamp >= quoteExpiry) {
      throw new HiringTransactionVerificationError(
        "quote-expired",
        "The provider quote expired before the transaction was mined. Request a new quote before retrying.",
      );
    }

    return {
      blockHash: null,
      blockNumber: null,
      confirmedAt: null,
      from: getAddress(transaction.from),
      hash: input.hash,
      onchainJobId: null,
      replacedHash: input.replacedHash ?? null,
      status: input.replacedHash ? "replaced" : "submitted",
      step: input.step,
    };
  }

  const receiptBlock = await input.client.getBlock({
    blockNumber: receipt.blockNumber,
  });
  const receiptTime = new Date(Number(receiptBlock.timestamp) * 1_000).toISOString();

  if (receiptBlock.timestamp >= quoteExpiry) {
    throw new HiringTransactionVerificationError(
      "quote-expired",
      "The provider quote had expired when the transaction was mined.",
    );
  }

  if (receipt.status !== "success") {
    return {
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber,
      confirmedAt: receiptTime,
      from: getAddress(transaction.from),
      hash: input.hash,
      onchainJobId: null,
      replacedHash: input.replacedHash ?? null,
      status: "failed",
      step: input.step,
    };
  }

  const currentBlockNumber = await input.client.getBlockNumber();
  const confirmationCount = currentBlockNumber - receipt.blockNumber + 1n;

  if (confirmationCount < BigInt(HIRING_CONFIRMATIONS)) {
    return {
      blockHash: receipt.blockHash,
      blockNumber: receipt.blockNumber,
      confirmedAt: null,
      from: getAddress(transaction.from),
      hash: input.hash,
      onchainJobId: null,
      replacedHash: input.replacedHash ?? null,
      status: input.replacedHash ? "replaced" : "submitted",
      step: input.step,
    };
  }

  const onchainJobId =
    input.step === "create_job"
      ? findCreatedJobId(receipt, input.job).toString()
      : input.job.onchain_job_id;

  if (input.step !== "create_job") {
    verifyStepEvent(receipt, input.job, input.step);
  }

  if (input.step === "fund_job") {
    await verifyFundedJob(input.client, input.job, receipt.blockNumber);
  }

  return {
    blockHash: receipt.blockHash,
    blockNumber: receipt.blockNumber,
    confirmedAt: receiptTime,
    from: getAddress(transaction.from),
    hash: input.hash,
    onchainJobId,
    replacedHash: input.replacedHash ?? null,
    status: "confirmed",
    step: input.step,
  };
}
