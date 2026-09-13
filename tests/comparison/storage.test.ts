import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("network-scoped comparison storage", () => {
  it("restores each network's agents after switching away and back", async () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const originalDocument = Object.getOwnPropertyDescriptor(
      globalThis,
      "document",
    );
    const values = new Map<string, string>();
    const localStorage: Storage = {
      clear: () => values.clear(),
      getItem: (key) => values.get(key) ?? null,
      key: (index) => [...values.keys()][index] ?? null,
      get length() {
        return values.size;
      },
      removeItem: (key) => values.delete(key),
      setItem: (key, value) => values.set(key, value),
    };

    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage },
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { cookie: "sift_catalogue_network=bsc-mainnet" },
    });

    try {
      const comparison = await import(
        "../../components/comparison/use-comparison-selection"
      );

      comparison.replaceComparisonSelection(
        [{ agentId: "12", chainId: 56 }],
        "mainnet task",
        56,
      );
      comparison.replaceComparisonSelection(
        [{ agentId: "44", chainId: 97 }],
        "testnet task",
        97,
      );

      assert.deepEqual(comparison.switchComparisonSelectionChain(56), {
        goal: "mainnet task",
        references: [{ agentId: "12", chainId: 56 }],
      });
      assert.deepEqual(comparison.switchComparisonSelectionChain(97), {
        goal: "testnet task",
        references: [{ agentId: "44", chainId: 97 }],
      });
    } finally {
      if (originalWindow) {
        Object.defineProperty(globalThis, "window", originalWindow);
      } else {
        Reflect.deleteProperty(globalThis, "window");
      }

      if (originalDocument) {
        Object.defineProperty(globalThis, "document", originalDocument);
      } else {
        Reflect.deleteProperty(globalThis, "document");
      }
    }
  });
});
