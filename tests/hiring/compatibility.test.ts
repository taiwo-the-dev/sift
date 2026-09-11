import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Address } from "viem";

import {
  assessHiringCompatibility,
  hasErc8183Declaration,
  isErc8183ServiceType,
  resolveHiringCompatibility,
} from "../../features/hiring/compatibility";
import {
  HiringQuoteError,
  parseAgentCommerceStatus,
  parseNegotiationEnvelope,
} from "../../features/hiring/quote";
import { getErc8183Deployment } from "../../features/hiring/protocol";

const erc8183Deployment = getErc8183Deployment(56);

const service = {
  endpoint: "https://agent.test-only.dev/erc8183",
  metadata: null,
  serviceType: "ERC-8183",
  version: "1",
};
const ownerAddress = "0x1111111111111111111111111111111111111111" as Address;

const profile = {
  active: true,
  chainId: 56,
  metadataStatus: "valid" as const,
  ownerAddress,
  services: [service],
};

describe("ERC-8183 hiring compatibility", () => {
  it("recognizes normalized protocol declarations and derives bounded URLs", () => {
    assert.equal(isErc8183ServiceType("erc8183"), true);
    assert.equal(hasErc8183Declaration([service]), true);
    assert.deepEqual(resolveHiringCompatibility(profile), {
      endpoint: "https://agent.test-only.dev/erc8183",
      negotiateUrl: "https://agent.test-only.dev/erc8183/negotiate",
      statusUrl: "https://agent.test-only.dev/erc8183/status",
    });
  });

  it("rejects unsafe, inactive, invalid-metadata, ownerless, and wrong-chain agents", () => {
    for (const candidate of [
      { ...profile, active: false },
      { ...profile, chainId: 1 },
      { ...profile, metadataStatus: "invalid" as const },
      { ...profile, ownerAddress: null },
      { ...profile, services: [{ ...service, endpoint: "http://localhost:3000/erc8183" }] },
      { ...profile, services: [{ ...service, endpoint: "https://user:secret@agent.example/erc8183" }] },
      { ...profile, services: [{ ...service, endpoint: "https://example.com/erc8183" }] },
      { ...profile, services: [{ ...service, version: "2.0.0" }] },
    ]) {
      assert.equal(resolveHiringCompatibility(candidate), null);
    }
  });

  it("supports a compatible testnet identity on its own deployment", () => {
    assert.notEqual(
      resolveHiringCompatibility({ ...profile, chainId: 97 }),
      null,
    );
  });

  it("returns an actionable, checkable reason for an unsupported agent", () => {
    const result = assessHiringCompatibility({
      ...profile,
      services: [],
    });

    assert.equal(result.code, "missing-service");
    assert.equal(result.compatibility, null);
    assert.equal(result.checks.at(-1)?.key, "service");
    assert.equal(result.checks.at(-1)?.status, "fail");
    assert.match(result.explanation, /ERC-8183/);
  });

  it("accepts a legacy status without decimals but rejects a conflicting declaration", () => {
    const status = {
      agent_address: profile.ownerAddress,
      chain_id: 56,
      commerce_address: erc8183Deployment.commerce,
      currency: erc8183Deployment.paymentToken,
      policy_address: erc8183Deployment.policy,
      router_address: erc8183Deployment.router,
      service_price: "0",
      status: "ok",
    };

    assert.equal(
      parseAgentCommerceStatus(status, profile.ownerAddress, 56).servicePrice,
      0n,
    );
    assert.throws(() =>
      parseAgentCommerceStatus(
        { ...status, decimals: 6 },
        profile.ownerAddress,
        56,
      ),
    );
  });

  it("identifies an outdated status format without trusting its numeric token price", () => {
    const status = {
      agent_address: profile.ownerAddress,
      commerce_address: erc8183Deployment.commerce,
      payment_token: erc8183Deployment.paymentToken,
      policy_address: "0x4F4678D4439feC812Ac7674Bb3Efb4C8f5Fb78A6",
      router_address: erc8183Deployment.router,
      service_price: 1_000_000_000_000_000_000,
      status: "ok",
    };

    assert.throws(
      () => parseAgentCommerceStatus(status, profile.ownerAddress, 56),
      (error: unknown) =>
        error instanceof HiringQuoteError &&
        error.code === "unsupported-agent-service" &&
        /older ERC-8183 hiring format/.test(error.message),
    );
  });

  it("identifies an unsigned legacy price response", () => {
    assert.throws(
      () =>
        parseNegotiationEnvelope({
          accepted: true,
          chain_id: 56,
          currency: erc8183Deployment.paymentToken,
          price: "1000000000000000000",
          provider_address: profile.ownerAddress,
          quote_expires_at: 1_788_857_342,
        }),
      (error: unknown) =>
        error instanceof HiringQuoteError &&
        error.code === "unsupported-agent-service" &&
        /unsigned price/.test(error.message),
    );
  });

  it("binds a status document to the reviewed chain-56 deployment", () => {
    const mainnet = getErc8183Deployment(56);
    const status = {
      agent_address: profile.ownerAddress,
      chain_id: 56,
      commerce_address: mainnet.commerce,
      currency: mainnet.paymentToken,
      decimals: mainnet.tokenDecimals,
      policy_address: mainnet.policy,
      router_address: mainnet.router,
      service_price: "1",
      status: "ok",
    };

    assert.equal(
      parseAgentCommerceStatus(status, profile.ownerAddress, 56).servicePrice,
      1n,
    );
    assert.throws(() =>
      parseAgentCommerceStatus(
        {
          ...status,
          commerce_address: "0x1111111111111111111111111111111111111111",
        },
        profile.ownerAddress,
        56,
      ),
    );
  });
});
