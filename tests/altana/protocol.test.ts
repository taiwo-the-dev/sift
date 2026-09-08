import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Call } from "@altananetwork/sdk";
import { encodeFunctionData } from "viem";

import {
  ALTANA_NATIVE_GAS_CAP_WEI,
  ALTANA_SDK_VERSION,
  assertAltanaSdkNetwork,
  buildAltanaBuyerPermissions,
  getAltanaNetwork,
  removeUnsafeApprovalCall,
  requiresExactCommerceApproval,
} from "../../features/altana/protocol";
import {
  commerceAbi,
  evaluatorRouterAbi,
  getErc8183Deployment,
  paymentTokenAbi,
} from "../../features/hiring/protocol";

describe("Altana bounded hiring permissions", () => {
  it("pins the reviewed SDK and KeyStore deployments", () => {
    assert.equal(ALTANA_SDK_VERSION, "0.7.1");
    assert.equal(
      getAltanaNetwork(56).keyStore,
      "0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a",
    );
    assert.equal(
      getAltanaNetwork(97).keyStore,
      "0x6b8361C29d05D498b1a12B54A37310f94171E94A",
    );
    assert.equal(
      getAltanaNetwork(97).sdkBundledPolicy,
      "0x4F4678D4439feC812Ac7674Bb3Efb4C8f5Fb78A6",
    );
    assert.notEqual(
      getAltanaNetwork(97).sdkBundledPolicy,
      getErc8183Deployment(97).policy,
    );
    const altana = getAltanaNetwork(97);
    const erc8183 = getErc8183Deployment(97);
    assert.doesNotThrow(() =>
      assertAltanaSdkNetwork({
        chainId: 97,
        commerce: erc8183.commerce,
        keyStore: altana.keyStore,
        keyStoreController: altana.keyStoreController,
        paymentToken: erc8183.paymentToken,
        policy: altana.sdkBundledPolicy,
        registry: altana.registry,
        router: erc8183.router,
      }),
    );
    assert.throws(
      () =>
        assertAltanaSdkNetwork({
          chainId: 97,
          commerce: erc8183.commerce,
          keyStore: altana.keyStore,
          keyStoreController: altana.keyStoreController,
          paymentToken: erc8183.paymentToken,
          policy: erc8183.policy,
          registry: altana.registry,
          router: erc8183.router,
        }),
      /does not match/,
    );
  });

  it("allows only four reviewed ERC-8183 functions and bounded spending", () => {
    const deployment = getErc8183Deployment(97);
    const permissions = buildAltanaBuyerPermissions(97, 5n);

    assert.deepEqual(
      permissions.calls?.map((permission) => "signature" in permission ? permission.signature : null),
      [
        "createJob(address,address,uint256,string,address)",
        "setBudget(uint256,uint256,bytes)",
        "fund(uint256,uint256,bytes)",
        "registerJob(uint256,address)",
      ],
    );
    assert.equal(
      permissions.calls?.some((permission) =>
        "signature" in permission && permission.signature.startsWith("approve("),
      ),
      false,
    );
    assert.deepEqual(permissions.spend, [
      { limit: 5n, period: "day", token: deployment.paymentToken },
      { limit: ALTANA_NATIVE_GAS_CAP_WEI, period: "day" },
    ]);
  });

  it("removes the token approval from the official five-call bundle", () => {
    const deployment = getErc8183Deployment(97);
    const calls: readonly Call[] = [
      {
        data: encodeFunctionData({
          abi: commerceAbi,
          functionName: "createJob",
          args: [
            "0x1111111111111111111111111111111111111111",
            deployment.router,
            2_000_000_000n,
            "test-only",
            deployment.router,
          ],
        }),
        to: deployment.commerce,
      },
      {
        data: encodeFunctionData({
          abi: evaluatorRouterAbi,
          functionName: "registerJob",
          args: [1n, deployment.policy],
        }),
        to: deployment.router,
      },
      {
        data: encodeFunctionData({
          abi: commerceAbi,
          functionName: "setBudget",
          args: [1n, 5n, "0x"],
        }),
        to: deployment.commerce,
      },
      {
        data: encodeFunctionData({
          abi: paymentTokenAbi,
          functionName: "approve",
          args: [deployment.commerce, 5n],
        }),
        to: deployment.paymentToken,
      },
      {
        data: encodeFunctionData({
          abi: commerceAbi,
          functionName: "fund",
          args: [1n, 5n, "0x"],
        }),
        to: deployment.commerce,
      },
    ];
    const protectedCalls = removeUnsafeApprovalCall(calls, 97);

    assert.equal(protectedCalls.length, 4);
    assert.equal(
      protectedCalls.some(
        (call) => call.to.toLowerCase() === deployment.paymentToken.toLowerCase(),
      ),
      false,
    );
  });

  it("fails closed if the official bundle shape changes", () => {
    const deployment = getErc8183Deployment(97);
    assert.throws(
      () => removeUnsafeApprovalCall([{ to: deployment.commerce }], 97),
      /no longer matches/,
    );
    assert.throws(
      () => buildAltanaBuyerPermissions(97, 1n, ALTANA_NATIVE_GAS_CAP_WEI + 1n),
      /outside Sift's supported range/,
    );
  });

  it("replaces both insufficient and excessive allowances with the exact budget", () => {
    assert.equal(requiresExactCommerceApproval(0n, 5n), true);
    assert.equal(requiresExactCommerceApproval(4n, 5n), true);
    assert.equal(requiresExactCommerceApproval(6n, 5n), true);
    assert.equal(requiresExactCommerceApproval(5n, 5n), false);
    assert.equal(requiresExactCommerceApproval(100n, 0n), false);
  });
});
