import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CATEGORY_TAXONOMY_VERSION,
  classifyAgentCategories,
  extractDeclaredCategoryLabels,
  extractRawDeclaredCategoryLabels,
  hasOffTaxonomyDeclaration,
} from "../../features/categories/taxonomy";

const observedAt = "2026-09-03T15:00:00.000Z";

describe("M14 category taxonomy", () => {
  it("keeps an exact metadata declaration separate from inference", () => {
    const evidence = classifyAgentCategories({
      declaredCategories: ["Grid Trading"],
      description: "Executes bounded grid levels on PancakeSwap.",
      name: "Grid Agent",
      observedAt,
      services: [
        {
          endpoint: "https://agent.example/.well-known/agent-card.json",
          metadata: null,
          serviceType: "A2A",
          version: "1",
        },
      ],
    });

    assert.equal(evidence[0]?.category, "grid-trading");
    assert.equal(evidence[0]?.source, "declared-metadata");
    assert.equal(evidence[0]?.confidence, 1);
    assert.equal(evidence[0]?.ruleVersion, CATEGORY_TAXONOMY_VERSION);
  });

  it("treats an exact service-metadata category as declared evidence", () => {
    const evidence = classifyAgentCategories({
      description: null,
      name: "Service-declared agent",
      observedAt,
      services: [
        {
          endpoint: "https://agent.example/a2a",
          metadata: { categories: ["Liquidity Rebalancing"] },
          serviceType: "A2A",
          version: null,
        },
      ],
    });

    assert.equal(evidence[0]?.category, "liquidity-rebalancing");
    assert.equal(evidence[0]?.source, "declared-metadata");
  });

  it("labels deterministic inference with lower confidence and source fields", () => {
    const evidence = classifyAgentCategories({
      description: "Monitors Venus health factor and liquidation risk.",
      name: "Position Sentinel",
      observedAt,
      services: [
        {
          endpoint: "https://agent.example/health",
          metadata: null,
          serviceType: "health",
          version: null,
        },
      ],
    });

    assert.deepEqual(evidence.map((item) => item.category), [
      "health-factor-monitoring",
    ]);
    assert.equal(evidence[0]?.source, "deterministic-rule");
    assert.equal(evidence[0]?.confidence, 0.65);
    assert.ok(evidence[0]?.facts.some((fact) => fact.value === "Venus"));
    assert.ok(
      evidence[0]?.facts.every((fact) => fact.sourceField.startsWith("agent.") || fact.sourceField.startsWith("services[")),
    );
  });

  it("does not classify generic trading, AI, APR or pool text", () => {
    const evidence = classifyAgentCategories({
      description: "An AI trading assistant that displays pool fees and APR.",
      name: "Generic Assistant",
      observedAt,
      services: [],
    });

    assert.deepEqual(evidence, []);
  });

  it("recognizes explicit Grid naming and hyphenated health-factor wording", () => {
    const grid = classifyAgentCategories({
      description: "Places a fixed ladder of v3 ranges.",
      name: "Grid",
      observedAt,
      services: [],
    });
    const health = classifyAgentCategories({
      description: "A Venus health-factor monitor.",
      name: "Health Guard",
      observedAt,
      services: [],
    });

    assert.equal(grid[0]?.category, "grid-trading");
    assert.equal(health[0]?.category, "health-factor-monitoring");
  });

  it("extracts only exact supported category declarations", () => {
    assert.deepEqual(
      extractDeclaredCategoryLabels({
        category: "yield optimisation",
        tags: ["DeFi", "Health Factor Monitoring"],
      }),
      ["yield optimisation", "Health Factor Monitoring"],
    );
  });

  it("keeps every raw declared category label for the Other badge", () => {
    assert.deepEqual(
      extractRawDeclaredCategoryLabels({
        category: "Portfolio Analytics",
        tags: ["DeFi", "Grid Trading"],
      }),
      ["Portfolio Analytics", "DeFi", "Grid Trading"],
    );
  });

  it("detects an off-taxonomy declaration only when nothing supported is declared", () => {
    assert.equal(
      hasOffTaxonomyDeclaration(["portfolio analytics", "sentiment"]),
      true,
    );
    assert.equal(
      hasOffTaxonomyDeclaration(["portfolio analytics", "grid trading"]),
      false,
    );
    assert.equal(hasOffTaxonomyDeclaration([]), false);
    assert.equal(hasOffTaxonomyDeclaration(["   "]), false);
  });

  it("rejects an invalid source observation time", () => {
    assert.throws(
      () =>
        classifyAgentCategories({
          description: "Grid trading",
          name: "Agent",
          observedAt: "not-a-time",
          services: [],
        }),
      /observation time/i,
    );
  });
});
