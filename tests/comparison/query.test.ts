import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildComparisonHref,
  parseAgentReference,
  parseComparisonSearchParams,
  parseComparisonSelection,
} from "../../features/comparison/query";

describe("comparison selection parsing", () => {
  it("validates, deduplicates and caps untrusted references before use", () => {
    const selection = parseComparisonSelection(
      [
        "97:1",
        "not-an-agent",
        "97:1",
        "97:2",
        "56:3",
        "97:4",
        "97:5",
      ],
      "  Protect   my loan from liquidation  ",
    );

    assert.deepEqual(selection.references, [
      { agentId: "1", chainId: 97 },
      { agentId: "2", chainId: 97 },
      { agentId: "3", chainId: 56 },
      { agentId: "4", chainId: 97 },
    ]);
    assert.equal(selection.invalidCount, 1);
    assert.equal(selection.duplicateCount, 1);
    assert.equal(selection.overflowCount, 1);
    assert.equal(selection.goal, "Protect my loan from liquidation");
  });

  it("rejects ambiguous or non-canonical identities", () => {
    assert.equal(parseAgentReference("97:01"), null);
    assert.equal(parseAgentReference("0:1"), null);
    assert.equal(parseAgentReference("97:1:2"), null);
    assert.equal(parseAgentReference("97:-1"), null);
  });

  it("restores repeated URL state and truncates an oversized goal", () => {
    const selection = parseComparisonSearchParams({
      agent: ["97:12", "56:44"],
      goal: "x".repeat(240),
    });

    assert.deepEqual(selection.references, [
      { agentId: "12", chainId: 97 },
      { agentId: "44", chainId: 56 },
    ]);
    assert.equal(selection.goal.length, 180);
  });

  it("serializes a stable shareable comparison URL", () => {
    const href = buildComparisonHref(
      [
        { agentId: "12", chainId: 97 },
        { agentId: "44", chainId: 56 },
      ],
      "grid trading",
    );
    const url = new URL(href, "https://sift.example");

    assert.equal(url.pathname, "/compare");
    assert.deepEqual(url.searchParams.getAll("agent"), ["97:12", "56:44"]);
    assert.equal(url.searchParams.get("goal"), "grid trading");
  });
});
