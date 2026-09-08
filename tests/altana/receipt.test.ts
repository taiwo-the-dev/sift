import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  encodeAbiParameters,
  encodeEventTopics,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";

import { altanaKeyId, getAltanaNetwork } from "../../features/altana/protocol";
import { inspectAltanaHiringTransaction } from "../../features/altana/receipt";
import {
  commerceAbi,
  evaluatorRouterAbi,
  getErc8183Deployment,
} from "../../features/hiring/protocol";
import { HiringTransactionVerificationError } from "../../features/hiring/receipt";
import type { HiringIntentRecord } from "../../lib/db/hiring-repository";

const wallet = "0x1111111111111111111111111111111111111111" as Address;
const provider = "0x2222222222222222222222222222222222222222" as Address;
const relay = "0x3333333333333333333333333333333333333333" as Address;
const hash = `0x${"1".repeat(64)}` as Hash;
const blockHash = `0x${"2".repeat(64)}` as Hash;
const publicKey = `0x04${"3".repeat(128)}` as Hex;
const deployment = getErc8183Deployment(97);
const jobId = 78n;

const job = {
  budget_base_units: "5",
  chain_id: 97,
  commerce_address: deployment.commerce,
  expires_at: "2026-10-01T01:00:00.000Z",
  onchain_description: "{\"task\":\"test-only\"}",
  onchain_job_id: null,
  payment_token_address: deployment.paymentToken,
  payment_token_decimals: deployment.tokenDecimals,
  payment_token_symbol: deployment.tokenSymbol,
  policy_address: deployment.policy,
  provider_address: provider,
  quote_expires_at: "2026-10-01T00:30:00.000Z",
  router_address: deployment.router,
  wallet_address: wallet,
} as HiringIntentRecord;

function eventLog(
  address: Address,
  topics: unknown,
  data: Hex,
) {
  return {
    address,
    data,
    topics: topics as TransactionReceipt["logs"][number]["topics"],
  };
}

function receipt(): TransactionReceipt {
  const expires = BigInt(Date.parse(job.expires_at) / 1_000);
  return {
    blockHash,
    blockNumber: 100n,
    logs: [
      eventLog(
        deployment.commerce,
        encodeEventTopics({
          abi: commerceAbi,
          eventName: "JobCreated",
          args: { client: wallet, jobId, provider },
        }),
        encodeAbiParameters(
          [{ type: "address" }, { type: "uint256" }, { type: "address" }],
          [deployment.router, expires, deployment.router],
        ),
      ),
      eventLog(
        deployment.router,
        encodeEventTopics({
          abi: evaluatorRouterAbi,
          eventName: "JobRegistered",
          args: { client: wallet, jobId, policy: deployment.policy },
        }),
        "0x",
      ),
      eventLog(
        deployment.commerce,
        encodeEventTopics({ abi: commerceAbi, eventName: "BudgetSet", args: { jobId } }),
        encodeAbiParameters([{ type: "uint256" }], [5n]),
      ),
      eventLog(
        deployment.commerce,
        encodeEventTopics({
          abi: commerceAbi,
          eventName: "JobFunded",
          args: { client: wallet, jobId, provider },
        }),
        encodeAbiParameters([{ type: "uint256" }], [5n]),
      ),
    ],
    status: "success",
  } as TransactionReceipt;
}

function client(active = true): PublicClient {
  return {
    getBlock: async () => ({ timestamp: 1_780_272_000n }),
    getBlockNumber: async () => 101n,
    getChainId: async () => 97,
    getTransaction: async () => ({ from: relay, to: wallet, value: 0n }),
    getTransactionReceipt: async () => receipt(),
    readContract: async ({ address, functionName }: { address: Address; functionName: string }) => {
      if (address === getAltanaNetwork(97).keyStore && functionName === "getPublicKey") return publicKey;
      if (address === getAltanaNetwork(97).keyStore && functionName === "isValidKey") return active;
      if (address === deployment.commerce && functionName === "getJob") {
        return {
          budget: 5n,
          client: wallet,
          deliverable: `0x${"0".repeat(64)}`,
          description: job.onchain_description,
          evaluator: deployment.router,
          expiredAt: BigInt(Date.parse(job.expires_at) / 1_000),
          hook: deployment.router,
          id: jobId,
          provider,
          status: 1,
          submittedAt: 0n,
        };
      }
      throw new Error(`Unexpected ${address} ${functionName}`);
    },
  } as unknown as PublicClient;
}

describe("Altana atomic hiring receipt verification", () => {
  it("requires the registered session and all funded-job evidence", async () => {
    const verified = await inspectAltanaHiringTransaction({
      client: client(),
      hash,
      job,
      sessionExpiry: 1_780_275_000,
      sessionPublicKey: publicKey,
    });

    assert.equal(verified.status, "confirmed");
    assert.equal(verified.onchainJobId, jobId.toString());
    assert.equal(verified.step, "fund_job");
    assert.equal(altanaKeyId(publicKey), altanaKeyId(publicKey));
  });

  it("rejects a session that was not active at the receipt block", async () => {
    await assert.rejects(
      inspectAltanaHiringTransaction({
        client: client(false),
        hash,
        job,
        sessionExpiry: 1_780_275_000,
        sessionPublicKey: publicKey,
      }),
      HiringTransactionVerificationError,
    );
  });
});
