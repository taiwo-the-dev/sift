import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encodeAbiParameters,
  encodeEventTopics,
  encodeFunctionData,
  type Address,
  type Hash,
  type PublicClient,
  type TransactionReceipt,
} from "viem";

import {
  commerceAbi,
  getErc8183Deployment,
} from "../../features/hiring/protocol";
import {
  HiringTransactionVerificationError,
  inspectHiringTransaction,
} from "../../features/hiring/receipt";
import type { HiringIntentRecord } from "../../lib/db/hiring-repository";

const wallet = "0x1111111111111111111111111111111111111111" as Address;
const provider = "0x2222222222222222222222222222222222222222" as Address;
const hash = `0x${"1".repeat(64)}` as Hash;
const blockHash = `0x${"2".repeat(64)}` as Hash;
const expiresAt = "2026-08-24T10:00:00.000Z";
const erc8183Deployment = getErc8183Deployment(97);

const job = {
  budget_base_units: "0",
  chain_id: 97,
  commerce_address: erc8183Deployment.commerce,
  expires_at: expiresAt,
  onchain_description: "{\"test\":true}",
  onchain_job_id: null,
  payment_token_address: erc8183Deployment.paymentToken,
  payment_token_decimals: erc8183Deployment.tokenDecimals,
  payment_token_symbol: erc8183Deployment.tokenSymbol,
  policy_address: erc8183Deployment.policy,
  provider_address: provider,
  quote_expires_at: "2026-08-23T10:15:00.000Z",
  router_address: erc8183Deployment.router,
  wallet_address: wallet,
} as HiringIntentRecord;

function clientForCreate(overrides: Readonly<{
  input?: Hash;
  job?: HiringIntentRecord;
  receipt?: TransactionReceipt | null;
}> = {}): PublicClient {
  const currentJob = overrides.job ?? job;
  const deployment = getErc8183Deployment(currentJob.chain_id);
  const input = overrides.input ?? encodeFunctionData({
    abi: commerceAbi,
    functionName: "createJob",
    args: [
      currentJob.provider_address as Address,
      deployment.router,
      BigInt(Date.parse(currentJob.expires_at) / 1_000),
      currentJob.onchain_description,
      deployment.router,
    ],
  });
  const topics = encodeEventTopics({
    abi: commerceAbi,
    eventName: "JobCreated",
    args: {
      client: currentJob.wallet_address as Address,
      jobId: 77n,
      provider: currentJob.provider_address as Address,
    },
  });
  const data = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }, { type: "address" }],
    [
      deployment.router,
      BigInt(Date.parse(currentJob.expires_at) / 1_000),
      deployment.router,
    ],
  );
  const receipt = overrides.receipt === undefined
    ? ({
        blockHash,
        blockNumber: 100n,
        logs: [{ address: deployment.commerce, data, topics }],
        status: "success",
      } as TransactionReceipt)
    : overrides.receipt;

  return {
    getBlock: async ({ blockNumber }: { blockNumber?: bigint } = {}) => ({
      number: blockNumber ?? 101n,
      timestamp: 1_777_000_000n,
    }),
    getBlockNumber: async () => 101n,
    getChainId: async () => currentJob.chain_id,
    getTransaction: async () => ({
      from: currentJob.wallet_address,
      input,
      to: deployment.commerce,
      value: 0n,
    }),
    getTransactionReceipt: async () => {
      if (!receipt) throw new Error("not found");
      return receipt;
    },
  } as unknown as PublicClient;
}

describe("server hiring receipt mapping", () => {
  it("maps a two-confirmation JobCreated receipt to its real job identifier", async () => {
    const result = await inspectHiringTransaction({
      client: clientForCreate(),
      hash,
      job,
      step: "create_job",
    });

    assert.equal(result.status, "confirmed");
    assert.equal(result.onchainJobId, "77");
    assert.equal(result.blockNumber, 100n);
    assert.equal(result.confirmedAt, "2026-04-24T03:06:40.000Z");
  });

  it("keeps a propagated transaction submitted when no receipt exists", async () => {
    const result = await inspectHiringTransaction({
      client: clientForCreate({ receipt: null }),
      hash,
      job,
      step: "create_job",
    });

    assert.equal(result.status, "submitted");
    assert.equal(result.blockNumber, null);
  });

  it("verifies a chain-56 receipt against the separate mainnet deployment", async () => {
    const mainnet = getErc8183Deployment(56);
    const mainnetJob = {
      ...job,
      chain_id: 56,
      commerce_address: mainnet.commerce,
      payment_token_address: mainnet.paymentToken,
      payment_token_decimals: mainnet.tokenDecimals,
      payment_token_symbol: mainnet.tokenSymbol,
      policy_address: mainnet.policy,
      router_address: mainnet.router,
    } as HiringIntentRecord;
    const result = await inspectHiringTransaction({
      client: clientForCreate({ job: mainnetJob }),
      hash,
      job: mainnetJob,
      step: "create_job",
    });

    assert.equal(result.status, "confirmed");
    assert.equal(result.onchainJobId, "77");
  });

  it("rejects calldata that differs from the reviewed provider", async () => {
    const badInput = encodeFunctionData({
      abi: commerceAbi,
      functionName: "createJob",
      args: [
        "0x3333333333333333333333333333333333333333",
        erc8183Deployment.router,
        BigInt(Date.parse(expiresAt) / 1_000),
        job.onchain_description,
        erc8183Deployment.router,
      ],
    });

    await assert.rejects(
      inspectHiringTransaction({
        client: clientForCreate({ input: badInput }),
        hash,
        job,
        step: "create_job",
      }),
      HiringTransactionVerificationError,
    );
  });
});
