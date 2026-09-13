import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildComparisonHref,
  buildDiscoveryHrefForComparison,
  parseAgentReference,
  parseComparisonSearchParams,
  parseComparisonSelection,
  scopeComparisonSelectionToChain,
} from "../../features/comparison/query";

describe("comparison selection parsing", () => {
  it("validates, deduplicates and caps untrusted references before use", () => {
    const selection = parseComparisonSelection(
      [
        "56:1",
        "not-an-agent",
        "56:1",
        "56:2",
        "56:3",
        "56:4",
        "56:5",
      ],
      "  Protect   my loan from liquidation  ",
    );

    assert.deepEqual(selection.references, [
      { agentId: "1", chainId: 56 },
      { agentId: "2", chainId: 56 },
      { agentId: "3", chainId: 56 },
      { agentId: "4", chainId: 56 },
    ]);
    assert.equal(selection.invalidCount, 1);
    assert.equal(selection.duplicateCount, 1);
    assert.equal(selection.overflowCount, 1);
    assert.equal(selection.goal, "Protect my loan from liquidation");
  });

  it("rejects ambiguous or non-canonical identities", () => {
    assert.equal(parseAgentReference("56:01"), null);
    assert.deepEqual(parseAgentReference("97:1"), {
      agentId: "1",
      chainId: 97,
    });
    assert.equal(parseAgentReference("0:1"), null);
    assert.equal(parseAgentReference("56:1:2"), null);
    assert.equal(parseAgentReference("56:-1"), null);
  });

  it("restores repeated URL state and truncates an oversized goal", () => {
    const selection = parseComparisonSearchParams({
      agent: ["56:12", "56:44"],
      goal: "x".repeat(240),
    });

    assert.deepEqual(selection.references, [
      { agentId: "12", chainId: 56 },
      { agentId: "44", chainId: 56 },
    ]);
    assert.equal(selection.goal.length, 180);
  });

  it("serializes a stable shareable comparison URL", () => {
    const href = buildComparisonHref(
      [
        { agentId: "12", chainId: 56 },
        { agentId: "44", chainId: 56 },
      ],
      "grid trading",
    );
    const url = new URL(href, "https://sift.example");

    assert.equal(url.pathname, "/compare");
    assert.deepEqual(url.searchParams.getAll("agent"), ["56:12", "56:44"]);
    assert.equal(url.searchParams.get("goal"), "grid trading");
  });

  it("keeps Mainnet and Testnet comparison selections separate", () => {
    const scoped = scopeComparisonSelectionToChain(
      parseComparisonSelection(["56:12", "97:44", "56:18"]),
      97,
    );

    assert.deepEqual(scoped.selection.references, [
      { agentId: "44", chainId: 97 },
    ]);
    assert.equal(scoped.excludedNetworkCount, 2);
  });

  it("preserves Testnet context in comparison and discovery links", () => {
    const comparisonUrl = new URL(
      buildComparisonHref([{ agentId: "44", chainId: 97 }], "monitor"),
      "https://sift.example",
    );
    const discoveryUrl = new URL(
      buildDiscoveryHrefForComparison("monitor", "bsc-testnet"),
      "https://sift.example",
    );

    assert.equal(comparisonUrl.searchParams.get("network"), "bsc-testnet");
    assert.equal(discoveryUrl.searchParams.get("network"), "bsc-testnet");
    assert.equal(discoveryUrl.searchParams.get("q"), "monitor");
  });
});
