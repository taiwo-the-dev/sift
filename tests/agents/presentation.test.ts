import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectDeclaredCapabilities,
  describeProfileProvenance,
  resolveProfileCategories,
} from "../../features/agents/presentation";
import type { AgentProfileService } from "../../features/agents/model";

const services: readonly AgentProfileService[] = [
  {
    endpoint: "https://agent.example/mcp",
    metadata: {
      domains: ["DeFi"],
      skills: ["Position monitoring", { name: "Liquidation alerts" }],
    },
    serviceType: "MCP",
    version: "1.0",
  },
];

describe("agent profile presentation", () => {
  it("derives transparent categories and declared capabilities", () => {
    const resolved = resolveProfileCategories(
      null,
      "Safety Sentinel",
      "Monitors collateral and liquidation risk.",
      services,
    );

    assert.deepEqual(resolved.categories, ["health-factor-monitoring"]);
    assert.equal(resolved.categorySource, "deterministic-keyword");
    assert.deepEqual(collectDeclaredCapabilities(services), [
      "Position monitoring",
      "Liquidation alerts",
      "DeFi",
    ]);
  });

  it("describes valid, stale and unavailable provenance honestly", () => {
    assert.equal(
      describeProfileProvenance("valid", true, "2026-08-22T10:00:00Z")
        .label,
      "Validated indexed metadata",
    );
    assert.equal(
      describeProfileProvenance(
        "unavailable",
        true,
        "2026-08-21T10:00:00Z",
      ).isStale,
      true,
    );
    assert.equal(
      describeProfileProvenance("invalid", false, null).label,
      "Invalid metadata",
    );
  });
});
