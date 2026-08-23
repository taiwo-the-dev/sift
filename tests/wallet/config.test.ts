import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parsePublicWalletEnvironment,
  PublicWalletConfigError,
} from "../../features/wallet/config";

describe("public wallet environment", () => {
  it("uses bounded public BNB RPC fallbacks and no invented project ID", () => {
    const config = parsePublicWalletEnvironment({});

    assert.equal(config.testnetRpcUrls.length, 3);
    assert.equal(config.mainnetRpcUrls.length, 3);
    assert.equal(config.walletConnectProjectId, null);
    assert.match(config.testnetRpcUrls[0], /^https:\/\//);
  });

  it("places validated public overrides before the free fallbacks", () => {
    const config = parsePublicWalletEnvironment({
      NEXT_PUBLIC_BNB_MAINNET_RPC_URL: "https://rpc.example/bsc/",
      NEXT_PUBLIC_BNB_TESTNET_RPC_URL: "https://rpc.example/bsc-testnet/",
      NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
        "0123456789abcdef0123456789abcdef",
    });

    assert.equal(config.mainnetRpcUrls[0], "https://rpc.example/bsc");
    assert.equal(
      config.testnetRpcUrls[0],
      "https://rpc.example/bsc-testnet",
    );
    assert.equal(
      config.walletConnectProjectId,
      "0123456789abcdef0123456789abcdef",
    );
  });

  it("rejects unsafe RPC values and malformed WalletConnect identifiers", () => {
    assert.throws(
      () =>
        parsePublicWalletEnvironment({
          NEXT_PUBLIC_BNB_TESTNET_RPC_URL: "http://localhost:8545",
        }),
      PublicWalletConfigError,
    );
    assert.throws(
      () =>
        parsePublicWalletEnvironment({
          NEXT_PUBLIC_BNB_MAINNET_RPC_URL:
            "https://user:password@rpc.example/bsc",
        }),
      PublicWalletConfigError,
    );
    assert.throws(
      () =>
        parsePublicWalletEnvironment({
          NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: "not-a-project-id",
        }),
      PublicWalletConfigError,
    );
  });
});
