import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  describeWalletChain,
  mapWalletError,
  shortenWalletAddress,
} from "../../features/wallet/presentation";
import { isSupportedWalletChainId } from "../../lib/blockchain/chains";

describe("wallet presentation", () => {
  it("shortens only real EVM addresses for privacy", () => {
    assert.equal(
      shortenWalletAddress("0x1234567890abcdef1234567890abcdef12345678"),
      "0x1234…5678",
    );
    assert.equal(shortenWalletAddress("not-an-address"), null);
    assert.equal(shortenWalletAddress(undefined), null);
  });

  it("recognizes only configured BNB chains", () => {
    assert.equal(isSupportedWalletChainId(97), true);
    assert.equal(isSupportedWalletChainId(56), true);
    assert.equal(isSupportedWalletChainId(1), false);
    assert.equal(describeWalletChain(97), "BSC Testnet");
    assert.equal(describeWalletChain(56), "BSC Mainnet");
    assert.equal(describeWalletChain(1), null);
  });

  it("maps rejected, pending, missing-provider and switching errors safely", () => {
    assert.equal(mapWalletError({ code: 4001 }).code, "request-rejected");
    assert.equal(mapWalletError({ code: -32002 }).code, "request-pending");
    assert.equal(
      mapWalletError({ name: "ProviderNotFoundError" }).code,
      "provider-unavailable",
    );
    assert.equal(
      mapWalletError({ name: "SwitchChainNotSupportedError" }).code,
      "switch-unavailable",
    );
  });

  it("never returns an untrusted provider message", () => {
    const result = mapWalletError(
      new Error("secret provider payload with internal account details"),
    );

    assert.equal(result.code, "unknown");
    assert.doesNotMatch(result.description, /secret|internal account/i);
  });
});
