import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Address, Hash } from "viem";

import {
  ActivationBindingError,
  assertActivationBinding,
  quoteRequiresRefreshForWallet,
} from "../../features/hiring/binding";
import type {
  HiringAgentSummary,
  HiringMissionInput,
  HiringQuote,
} from "../../features/hiring/model";
import { getErc8183Deployment } from "../../features/hiring/protocol";

const erc8183Deployment = getErc8183Deployment(56);

const owner = "0x1111111111111111111111111111111111111111" as Address;
const walletA = "0x2222222222222222222222222222222222222222" as Address;
const walletB = "0x3333333333333333333333333333333333333333" as Address;
const now = Date.UTC(2026, 8, 5, 12);

const agent: HiringAgentSummary = {
  agentId: "1503",
  chainId: 56,
  imageUrl: null,
  name: "Test fixture agent",
  ownerAddress: owner,
  profileHref: "/agents/56/1503",
};

const mission: HiringMissionInput = {
  deliverables: "A bounded public test report.",
  durationSeconds: 86_400,
  maxSpend: "1",
  mission: "Produce a bounded mainnet analysis report.",
  qualityStandards: "Cite public inputs and label missing evidence.",
};

const quote: HiringQuote = {
  budgetBaseUnits: "500000000000000000",
  budgetDisplay: "0.5",
  chainId: 56,
  disputeWindowSeconds: 3_600,
  estimatedCompletionSeconds: 300,
  expiresAt: new Date(now + 86_400_000).toISOString(),
  maximumSpendBaseUnits: "1000000000000000000",
  maximumSpendDisplay: "1",
  negotiationHash: `0x${"1".repeat(64)}` as Hash,
  onchainDescription: "test fixture",
  platformFeeBasisPoints: 100,
  providerAddress: owner,
  quoteExpiresAt: new Date(now + 300_000).toISOString(),
  signedEnvelope: {
    verifying_contract: erc8183Deployment.commerce,
  },
  signatureMethod: "eip191",
  tokenAddress: erc8183Deployment.paymentToken,
  tokenDecimals: erc8183Deployment.tokenDecimals,
  tokenSymbol: erc8183Deployment.tokenSymbol,
};

describe("activation binding", () => {
  it("binds the reviewed quote to chain, owner, contract, token, amount, expiry, and wallet", () => {
    const checks = assertActivationBinding({
      agent,
      mission,
      now,
      quote,
      walletAddress: walletA,
    });

    assert.deepEqual(
      checks.map((check) => check.key),
      ["chain", "owner", "contract", "token", "amount", "expiry", "wallet"],
    );
  });

  it("fails closed when a quote target or reviewed amount changes", () => {
    assert.throws(
      () =>
        assertActivationBinding({
          agent,
          mission,
          now,
          quote: {
            ...quote,
            signedEnvelope: {
              verifying_contract: walletB,
            },
          },
          walletAddress: walletA,
        }),
      (error) =>
        error instanceof ActivationBindingError && error.check === "contract",
    );

    assert.throws(
      () =>
        assertActivationBinding({
          agent,
          mission,
          now,
          quote: { ...quote, budgetBaseUnits: "1000000000000000001" },
          walletAddress: walletA,
        }),
      (error) =>
        error instanceof ActivationBindingError && error.check === "amount",
    );
  });

  it("refreshes only a wallet-bound quote when the connected account changes", () => {
    assert.equal(quoteRequiresRefreshForWallet(walletA, walletA), false);
    assert.equal(quoteRequiresRefreshForWallet(walletA, walletB), true);
    assert.equal(quoteRequiresRefreshForWallet(null, walletB), false);
  });

  it("binds a chain-56 quote to the reviewed mainnet contracts", () => {
    const mainnet = getErc8183Deployment(56);
    const checks = assertActivationBinding({
      agent: { ...agent, chainId: 56 },
      mission,
      now,
      quote: {
        ...quote,
        chainId: 56,
        signedEnvelope: { verifying_contract: mainnet.commerce },
        tokenAddress: mainnet.paymentToken,
        tokenDecimals: mainnet.tokenDecimals,
        tokenSymbol: mainnet.tokenSymbol,
      },
      walletAddress: walletA,
    });

    assert.equal(checks[0]?.label, "BSC Mainnet · chain 56");
  });
});
