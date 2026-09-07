import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildHiringAddressHref,
  buildHiringTransactionHref,
  getErc8183Deployment,
  isHiringChainId,
  transactionDestination,
} from "../../features/hiring/protocol";

describe("chain-aware ERC-8183 deployment configuration", () => {
  it("uses the reviewed BSC Mainnet APEX deployment", () => {
    const deployment = getErc8183Deployment(56);

    assert.equal(deployment.networkName, "BSC Mainnet");
    assert.equal(
      deployment.commerce,
      "0xEa4DAa3100A767e86FDed867729ae7446476EBA6",
    );
    assert.equal(
      deployment.router,
      "0x51895229E12F9876011789B04f8698af06cCD6DA",
    );
    assert.equal(
      deployment.policy,
      "0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5",
    );
    assert.equal(
      deployment.paymentToken,
      "0xcE24439F2D9C6a2289F741120FE202248B666666",
    );
    assert.equal(transactionDestination("fund_job", 56), deployment.commerce);
    assert.match(buildHiringAddressHref(56, deployment.commerce), /^https:\/\/bscscan\.com\/address\//);
    assert.match(
      buildHiringTransactionHref(56, `0x${"1".repeat(64)}`),
      /^https:\/\/bscscan\.com\/tx\//,
    );
  });

  it("keeps mainnet and testnet addresses and explorers isolated", () => {
    const mainnet = getErc8183Deployment(56);
    const testnet = getErc8183Deployment(97);

    assert.notEqual(mainnet.commerce, testnet.commerce);
    assert.notEqual(mainnet.paymentToken, testnet.paymentToken);
    assert.match(
      buildHiringAddressHref(97, testnet.commerce),
      /^https:\/\/testnet\.bscscan\.com\/address\//,
    );
    assert.equal(isHiringChainId(56), true);
    assert.equal(isHiringChainId(97), true);
    assert.equal(isHiringChainId(1), false);
  });
});
