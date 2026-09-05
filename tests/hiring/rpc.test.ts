import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveHiringRpcUrls } from "../../features/hiring/rpc";

const publicFallbacks = [
  "https://testnet-one.example.org/",
  "https://testnet-two.example.org/",
  "https://testnet-three.example.org/",
] as const;

describe("hiring RPC isolation", () => {
  it("uses only valid testnet-specific overrides", () => {
    assert.deepEqual(
      resolveHiringRpcUrls(publicFallbacks, {
        BNB_TESTNET_RPC_FALLBACK_1: "http://unsafe.example.org",
        BNB_TESTNET_RPC_PRIMARY: "https://testnet-provider.example.org/key",
      }),
      [
        "https://testnet-provider.example.org/key",
        publicFallbacks[1],
        publicFallbacks[2],
      ],
    );
  });

  it("cannot consume a generic mainnet indexer RPC", () => {
    const environment = {
      BNB_NETWORK: "bsc-mainnet",
      BNB_RPC_PRIMARY: "https://mainnet-provider.example.org/key",
    };

    assert.deepEqual(resolveHiringRpcUrls(publicFallbacks, environment), publicFallbacks);
  });
});

