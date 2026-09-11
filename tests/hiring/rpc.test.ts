import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveHiringRpcUrls } from "../../features/hiring/rpc";

const publicFallbacks = [
  "https://mainnet-one.example.org/",
  "https://mainnet-two.example.org/",
  "https://mainnet-three.example.org/",
] as const;

describe("hiring RPC isolation", () => {
  it("uses only valid mainnet-specific overrides", () => {
    assert.deepEqual(
      resolveHiringRpcUrls(56, publicFallbacks, {
        BNB_MAINNET_RPC_FALLBACK_1: "http://unsafe.example.org",
        BNB_MAINNET_RPC_PRIMARY: "https://mainnet-provider.example.org/key",
      }),
      [
        "https://mainnet-provider.example.org/key",
        publicFallbacks[1],
        publicFallbacks[2],
      ],
    );
  });

  it("cannot consume a generic indexer RPC", () => {
    const environment = {
      BNB_NETWORK: "bsc-mainnet",
      BNB_RPC_PRIMARY: "https://mainnet-provider.example.org/key",
    };

    assert.deepEqual(resolveHiringRpcUrls(56, publicFallbacks, environment), publicFallbacks);
  });

  it("uses only mainnet-specific overrides for chain 56", () => {
    assert.deepEqual(
      resolveHiringRpcUrls(56, publicFallbacks, {
        BNB_MAINNET_RPC_PRIMARY: "https://mainnet-provider.example.org/key",
        BNB_TESTNET_RPC_PRIMARY: "https://ignored-provider.example.org/key",
      }),
      [
        "https://mainnet-provider.example.org/key",
        publicFallbacks[1],
        publicFallbacks[2],
      ],
    );
  });

  it("uses only testnet-specific overrides for chain 97", () => {
    assert.deepEqual(
      resolveHiringRpcUrls(97, publicFallbacks, {
        BNB_MAINNET_RPC_PRIMARY: "https://ignored-provider.example.org/key",
        BNB_TESTNET_RPC_PRIMARY: "https://testnet-provider.example.org/key",
      }),
      [
        "https://testnet-provider.example.org/key",
        publicFallbacks[1],
        publicFallbacks[2],
      ],
    );
  });
});
