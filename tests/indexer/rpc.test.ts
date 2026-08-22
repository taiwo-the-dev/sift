import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Address, Hex } from "viem";

import { createLogger } from "../../lib/indexer/logger";
import {
  RegistryRpcPool,
  type RegistryRpcProvider,
} from "../../lib/indexer/rpc";

const registry = "0x8004A818BFB912233c491871b3d84c89A494BD9e";

function provider(
  name: string,
  overrides: Partial<RegistryRpcProvider> = {},
): RegistryRpcProvider {
  return {
    getBlockNumber: async () => 100n,
    getBlockTimestamp: async () => 1_700_000_000n,
    getBytecode: async () => "0x01" as Hex,
    getChainId: async () => 97,
    getLogs: async () => [],
    name,
    ownerOf: async () =>
      "0x1111111111111111111111111111111111111111" as Address,
    tokenUri: async () => "",
    ...overrides,
  };
}

describe("ordered RPC fallback", () => {
  it("uses a healthy fallback and emits observable sanitized logs", async () => {
    const lines: string[] = [];
    const pool = new RegistryRpcPool(
      [
        provider("primary", {
          getLogs: async () => {
            throw new Error("failed https://rpc.example?apiKey=super-secret");
          },
        }),
        provider("fallback"),
      ],
      createLogger((line) => lines.push(line)),
    );

    await pool.validate(97, registry);
    assert.deepEqual(await pool.getLogs(registry, 1n, 2n), []);
    assert.equal(lines.some((line) => line.includes("rpc_fallback_used")), true);
    assert.equal(lines.some((line) => line.includes("super-secret")), false);
  });

  it("rejects providers connected to a different chain", async () => {
    const pool = new RegistryRpcPool(
      [provider("wrong-chain", { getChainId: async () => 56 })],
      createLogger(() => undefined),
    );

    await assert.rejects(() => pool.validate(97, registry));
  });
});
