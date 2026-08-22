import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { selectHealthEndpoint } from "../../features/health/eligibility";

describe("health endpoint eligibility", () => {
  it("selects conservative HTTPS health and A2A discovery targets", () => {
    const health = selectHealthEndpoint([
      { endpoint: "https://agent.public/health", serviceType: "health" },
    ]);
    const a2a = selectHealthEndpoint([
      {
        endpoint: "https://agent.public/.well-known/agent-card.json",
        serviceType: "A2A",
      },
    ]);

    assert.equal(health.target?.kind, "health-endpoint");
    assert.equal(a2a.target?.kind, "a2a-card");
    assert.match(health.target?.endpointHash ?? "", /^[0-9a-f]{64}$/);
  });

  it("does not probe unsupported, unsafe, credentialed, or placeholder URLs", () => {
    for (const service of [
      { endpoint: "https://agent.public/mcp", serviceType: "MCP" },
      { endpoint: "http://agent.public/health", serviceType: "health" },
      { endpoint: "https://user:pass@agent.public/health", serviceType: "health" },
      { endpoint: "https://agent.public:8443/health", serviceType: "health" },
      { endpoint: "https://agent.public/health?token=secret", serviceType: "health" },
      { endpoint: "https://agent.example/health", serviceType: "health" },
    ]) {
      const result = selectHealthEndpoint([service]);
      assert.equal(result.target, null);
      assert.equal(result.observation?.status, "unknown");
      assert.equal(result.observation?.wasProbed, false);
    }
  });

  it("prefers an eligible health endpoint over rejected declarations", () => {
    const result = selectHealthEndpoint([
      { endpoint: "https://agent.public/mcp", serviceType: "MCP" },
      { endpoint: "not a url", serviceType: "A2A" },
      { endpoint: "https://agent.public/health", serviceType: "health" },
    ]);

    assert.equal(result.target?.checkedEndpoint, "https://agent.public/health");
  });

  it("returns explicit unknown reasons when nothing can be checked", () => {
    assert.equal(selectHealthEndpoint([]).observation?.outcome, "no-endpoint");
    assert.equal(
      selectHealthEndpoint([
        { endpoint: "not a url", serviceType: "health" },
      ]).observation?.outcome,
      "invalid-endpoint",
    );
  });
});
