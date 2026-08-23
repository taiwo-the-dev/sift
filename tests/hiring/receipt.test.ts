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
  erc8183Deployment,
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

const job = {
  budget_base_units: "0",
  expires_at: expiresAt,
  onchain_description: "{\"test\":true}",
  onchain_job_id: null,
  provider_address: provider,
  quote_expires_at: "2026-08-23T10:15:00.000Z",
  wallet_address: wallet,
} as HiringIntentRecord;

function clientForCreate(overrides: Readonly<{ input?: Hash; receipt?: TransactionReceipt | null }> = {}): PublicClient {
  const input = overrides.input ?? encodeFunctionData({
    abi: commerceAbi,
    functionName: "createJob",
    args: [
      provider,
      erc8183Deployment.router,
      BigInt(Date.parse(expiresAt) / 1_000),
      job.onchain_description,
      erc8183Deployment.router,
    ],
  });
  const topics = encodeEventTopics({
    abi: commerceAbi,
    eventName: "JobCreated",
    args: { client: wallet, jobId: 77n, provider },
  });
  const data = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }, { type: "address" }],
    [erc8183Deployment.router, BigInt(Date.parse(expiresAt) / 1_000), erc8183Deployment.router],
  );
  const receipt = overrides.receipt === undefined
    ? ({
        blockHash,
        blockNumber: 100n,
        logs: [{ address: erc8183Deployment.commerce, data, topics }],
        status: "success",
      } as TransactionReceipt)
    : overrides.receipt;

  return {
    getBlock: async ({ blockNumber }: { blockNumber?: bigint } = {}) => ({
      number: blockNumber ?? 101n,
      timestamp: 1_777_000_000n,
    }),
    getBlockNumber: async () => 101n,
    getChainId: async () => 97,
    getTransaction: async () => ({
      from: wallet,
      input,
      to: erc8183Deployment.commerce,
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
