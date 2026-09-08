import {
  decodeEventLog,
  getAddress,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";

import {
  altanaKeyId,
  altanaKeyStoreAbi,
  getAltanaNetwork,
} from "@/features/altana/protocol";
import {
  commerceAbi,
  evaluatorRouterAbi,
  getErc8183Deployment,
  HIRING_CONFIRMATIONS,
  isHiringChainId,
} from "@/features/hiring/protocol";
import {
  HiringTransactionVerificationError,
  type VerifiedHiringTransaction,
} from "@/features/hiring/receipt";
import type { HiringIntentRecord } from "@/lib/db/hiring-repository";

type VerifiedAltanaHiringTransaction = VerifiedHiringTransaction &
  Readonly<{ to: Address }>;

function expectEvidence(condition: boolean, message: string): void {
  if (!condition) {
    throw new HiringTransactionVerificationError("invalid-transaction", message);
  }
}

function unixSeconds(value: string): bigint {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new HiringTransactionVerificationError(
      "invalid-transaction",
      "The saved hiring expiry is invalid.",
    );
  }
  return BigInt(Math.floor(timestamp / 1_000));
}

function findJobCreated(
  receipt: TransactionReceipt,
  job: HiringIntentRecord,
): bigint {
  const deployment = getErc8183Deployment(job.chain_id);

  for (const log of receipt.logs) {
    if (getAddress(log.address) !== deployment.commerce) continue;
    try {
      const event = decodeEventLog({
        abi: commerceAbi,
        data: log.data,
        topics: log.topics,
      });
      if (
        event.eventName === "JobCreated" &&
        getAddress(event.args.client) === getAddress(job.wallet_address) &&
        getAddress(event.args.provider) === getAddress(job.provider_address) &&
        getAddress(event.args.evaluator) === deployment.router &&
        getAddress(event.args.hook) === deployment.router &&
        event.args.expiredAt === unixSeconds(job.expires_at)
      ) {
        return event.args.jobId;
      }
    } catch {
      // Ignore unrelated logs emitted by the Commerce contract.
    }
  }

  throw new HiringTransactionVerificationError(
    "invalid-transaction",
    "The Altana transaction did not create the reviewed ERC-8183 job.",
  );
}

function hasRegistration(
  receipt: TransactionReceipt,
  job: HiringIntentRecord,
  jobId: bigint,
): boolean {
  const deployment = getErc8183Deployment(job.chain_id);
  return receipt.logs.some((log) => {
    if (getAddress(log.address) !== deployment.router) return false;
    try {
      const event = decodeEventLog({
        abi: evaluatorRouterAbi,
        data: log.data,
        topics: log.topics,
      });
      return (
        event.eventName === "JobRegistered" &&
        event.args.jobId === jobId &&
        getAddress(event.args.policy) === deployment.policy &&
        getAddress(event.args.client) === getAddress(job.wallet_address)
      );
    } catch {
      return false;
    }
  });
}

function hasCommerceEvent(
  receipt: TransactionReceipt,
  job: HiringIntentRecord,
  jobId: bigint,
  eventName: "BudgetSet" | "JobFunded",
): boolean {
  const deployment = getErc8183Deployment(job.chain_id);
  const budget = BigInt(job.budget_base_units);
  return receipt.logs.some((log) => {
    if (getAddress(log.address) !== deployment.commerce) return false;
    try {
      const event = decodeEventLog({
        abi: commerceAbi,
        data: log.data,
        topics: log.topics,
      });
      if (eventName === "BudgetSet" && event.eventName === "BudgetSet") {
        return event.args.jobId === jobId && event.args.amount === budget;
      }
      if (eventName === "JobFunded" && event.eventName === "JobFunded") {
        return (
          event.args.jobId === jobId &&
          getAddress(event.args.client) === getAddress(job.wallet_address) &&
          getAddress(event.args.provider) === getAddress(job.provider_address) &&
          event.args.amount === budget
        );
      }
      return false;
    } catch {
      return false;
    }
  });
}

export async function inspectAltanaHiringTransaction(input: Readonly<{
  client: PublicClient;
  hash: Hash;
  job: HiringIntentRecord;
  sessionExpiry: number;
  sessionPublicKey: Hex;
}>): Promise<VerifiedAltanaHiringTransaction> {
  if (!isHiringChainId(input.job.chain_id)) {
    throw new HiringTransactionVerificationError(
      "chain-unavailable",
      "The saved hiring request uses an unsupported network.",
    );
  }

  const deployment = getErc8183Deployment(input.job.chain_id);
  const network = getAltanaNetwork(input.job.chain_id);
  expectEvidence(
    getAddress(input.job.commerce_address) === deployment.commerce &&
      getAddress(input.job.router_address) === deployment.router &&
      getAddress(input.job.policy_address) === deployment.policy &&
      getAddress(input.job.payment_token_address) === deployment.paymentToken &&
      input.job.payment_token_decimals === deployment.tokenDecimals &&
      input.job.payment_token_symbol === deployment.tokenSymbol,
    "The saved hiring deployment no longer matches Sift's reviewed network configuration.",
  );
  const chainId = await input.client.getChainId();
  if (chainId !== input.job.chain_id) {
    throw new HiringTransactionVerificationError(
      "chain-unavailable",
      `The verifier is not connected to ${deployment.networkName}.`,
    );
  }

  let receipt: TransactionReceipt;
  try {
    receipt = await input.client.getTransactionReceipt({ hash: input.hash });
  } catch {
    throw new HiringTransactionVerificationError(
      "invalid-transaction",
      "The Altana transaction is not confirmed yet. Wait briefly, then retry.",
    );
  }

  const transaction = await input.client.getTransaction({ hash: input.hash });
  expectEvidence(receipt.status === "success", "The Altana transaction reverted.");
  expectEvidence(
    transaction.to !== null &&
      getAddress(transaction.to) === getAddress(input.job.wallet_address) &&
      transaction.value === 0n,
    "The Altana relay transaction does not target the reviewed passkey wallet.",
  );

  const currentBlock = await input.client.getBlockNumber();
  expectEvidence(
    currentBlock - receipt.blockNumber + 1n >= BigInt(HIRING_CONFIRMATIONS),
    `Wait for ${HIRING_CONFIRMATIONS} confirmations before recording this hire.`,
  );

  const block = await input.client.getBlock({ blockNumber: receipt.blockNumber });
  const quoteExpiry = unixSeconds(input.job.quote_expires_at);
  expectEvidence(
    block.timestamp < quoteExpiry,
    "The provider quote had expired when the transaction was confirmed.",
  );
  expectEvidence(
    Number.isSafeInteger(input.sessionExpiry) &&
      input.sessionExpiry > Number(block.timestamp),
    "The registered session had expired before the hire was confirmed.",
  );

  const publicKey = await input.client.readContract({
    address: network.keyStore,
    abi: altanaKeyStoreAbi,
    functionName: "getPublicKey",
    args: [getAddress(input.job.wallet_address), altanaKeyId(input.sessionPublicKey)],
    blockNumber: receipt.blockNumber,
  });
  const wasActive = await input.client.readContract({
    address: network.keyStore,
    abi: altanaKeyStoreAbi,
    functionName: "isValidKey",
    args: [getAddress(input.job.wallet_address), altanaKeyId(input.sessionPublicKey)],
    blockNumber: receipt.blockNumber,
  });
  expectEvidence(
    wasActive && publicKey.toLowerCase() === input.sessionPublicKey.toLowerCase(),
    "The session key was not registered in Altana KeyStore at the confirmation block.",
  );

  const jobId = findJobCreated(receipt, input.job);
  expectEvidence(
    hasRegistration(receipt, input.job, jobId),
    "The atomic transaction did not register the expected evaluation policy.",
  );
  expectEvidence(
    hasCommerceEvent(receipt, input.job, jobId, "BudgetSet"),
    "The atomic transaction did not set the signed job budget.",
  );
  expectEvidence(
    hasCommerceEvent(receipt, input.job, jobId, "JobFunded"),
    "The atomic transaction did not fund the reviewed job.",
  );

  const onchain = await input.client.readContract({
    address: deployment.commerce,
    abi: commerceAbi,
    functionName: "getJob",
    args: [jobId],
    blockNumber: receipt.blockNumber,
  });
  expectEvidence(
    onchain.id === jobId &&
      getAddress(onchain.client) === getAddress(input.job.wallet_address) &&
      getAddress(onchain.provider) === getAddress(input.job.provider_address) &&
      getAddress(onchain.evaluator) === deployment.router &&
      onchain.description === input.job.onchain_description &&
      onchain.budget === BigInt(input.job.budget_base_units) &&
      onchain.expiredAt === unixSeconds(input.job.expires_at) &&
      getAddress(onchain.hook) === deployment.router &&
      Number(onchain.status) === 1,
    "The confirmed Altana transaction does not match the reviewed funded job.",
  );

  return {
    blockHash: receipt.blockHash,
    blockNumber: receipt.blockNumber,
    confirmedAt: new Date(Number(block.timestamp) * 1_000).toISOString(),
    from: getAddress(transaction.from),
    hash: input.hash,
    onchainJobId: jobId.toString(),
    replacedHash: null,
    status: "confirmed",
    step: "fund_job",
    to: getAddress(transaction.to!),
  };
}
