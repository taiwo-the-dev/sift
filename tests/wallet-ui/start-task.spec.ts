import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StartTaskFlow } from "../../components/activation/start-task-flow";
import type { AgentProfileService } from "../../features/agents/model";

const agent = {
  agentId: "1",
  chainId: 56,
  name: "Test agent",
} as const;

function render(service: AgentProfileService): string {
  return renderToStaticMarkup(
    createElement(StartTaskFlow, {
      agent,
      services: [service],
    }),
  );
}

describe("start task forms", () => {
  it("submits an A2A task from the Send task button", () => {
    const html = render({
      activationMethod: "a2a",
      availabilityStatus: "available",
      endpoint: "https://agent.example/a2a",
      id: "00000000-0000-4000-8000-000000000001",
      metadata: null,
      serviceType: "A2A",
      version: "1.0",
    });

    assert.match(html, /<button[^>]*type="submit"[^>]*>[\s\S]*Send task/);
  });

  it("submits an MCP tool call from the Run tool button", () => {
    const html = render({
      activationMethod: "mcp",
      availabilityStatus: "available",
      capabilitySummary: {
        tools: [{ inputSchema: { type: "object" }, name: "inspect", readOnly: true }],
      },
      endpoint: "https://agent.example/mcp",
      id: "00000000-0000-4000-8000-000000000002",
      metadata: null,
      serviceType: "MCP",
      version: "2025-06-18",
    });

    assert.match(html, /<button[^>]*type="submit"[^>]*>[\s\S]*Run tool/);
    assert.match(html, />Inspect</);
    assert.doesNotMatch(html, /Inspect —/);
    assert.match(html, /Sift blocks tools that can make changes or move funds/);
  });
});
