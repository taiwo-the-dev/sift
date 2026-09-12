import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  collectDeclaredCapabilities,
  describeDeclaredService,
  describeProfileProvenance,
  formatCapabilityLabel,
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
    assert.equal(resolved.categorySource, "deterministic-rule");
    assert.deepEqual(collectDeclaredCapabilities(services), [
      "Position monitoring",
      "Liquidation alerts",
      "DeFi",
    ]);
  });

  it("describes valid, stale and unavailable profile data honestly", () => {
    assert.equal(
      describeProfileProvenance("valid", true, "2026-08-22T10:00:00Z")
        .label,
      "Profile verified",
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
      "Invalid profile data",
    );
  });

  it("uses only a bounded declared service description", () => {
    assert.equal(
      describeDeclaredService({
        ...services[0],
        metadata: { description: "  Monitors   supported positions.  " },
      }),
      "Monitors supported positions.",
    );
    assert.equal(
      describeDeclaredService({
        ...services[0],
        metadata: { description: "x".repeat(501) },
      }),
      null,
    );
    assert.equal(
      describeDeclaredService({ ...services[0], metadata: { name: "MCP" } }),
      null,
    );
  });

  it("formats technical capability paths as readable labels", () => {
    assert.equal(
      formatCapabilityLabel(
        "natural_language_processing/analytical_reasoning/analytical_reasoning",
      ),
      "Natural language processing · Analytical reasoning",
    );
    assert.equal(formatCapabilityLabel("DeFi"), "DeFi");
  });
});
