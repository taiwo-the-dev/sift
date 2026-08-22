import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bnbNetworkDefinitions,
  IndexerConfigError,
  parseIndexerConfig,
} from "../../lib/indexer/config";

describe("parseIndexerConfig", () => {
  it("uses the verified BSC Testnet deployment by default", () => {
    const config = parseIndexerConfig({});

    assert.equal(config.chainId, 97);
    assert.equal(config.deploymentBlock, 84_555_147n);
    assert.equal(
      config.registryAddress,
      bnbNetworkDefinitions["bsc-testnet"].registryAddress,
    );
    assert.equal(config.rpcEndpoints.length, 3);
  });

  it("supports validated mainnet and ordered RPC overrides", () => {
    const config = parseIndexerConfig({
      BNB_NETWORK: "bsc-mainnet",
      BNB_RPC_FALLBACK_1: "https://fallback.example/rpc",
      BNB_RPC_PRIMARY: "https://primary.example/rpc?key=secret",
      INDEXER_BATCH_SIZE: "1000",
      INDEXER_MIN_BATCH_SIZE: "50",
    });

    assert.equal(config.chainId, 56);
    assert.equal(config.deploymentBlock, 79_027_268n);
    assert.deepEqual(config.rpcEndpoints, [
      "https://primary.example/rpc?key=secret",
      "https://fallback.example/rpc",
      "https://bsc-dataseed.bnbchain.org",
    ]);
    assert.equal(config.batchSize, 1_000n);
  });

  it("rejects malformed addresses, networks, and batch bounds", () => {
    assert.throws(
      () => parseIndexerConfig({ BNB_NETWORK: "ethereum" }),
      IndexerConfigError,
    );
    assert.throws(
      () =>
        parseIndexerConfig({ ERC8004_REGISTRY_ADDRESS: "not-an-address" }),
      IndexerConfigError,
    );
    assert.throws(
      () =>
        parseIndexerConfig({
          INDEXER_BATCH_SIZE: "10",
          INDEXER_MIN_BATCH_SIZE: "20",
        }),
      IndexerConfigError,
    );
  });
});
