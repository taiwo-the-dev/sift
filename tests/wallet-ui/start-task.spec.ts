import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { StartTaskFlow } from "../../components/activation/start-task-flow";
import { WalletProvider } from "../../components/wallet/wallet-provider";
import type { AgentProfileService } from "../../features/agents/model";

const agent = {
  agentId: "1",
  chainId: 56,
  name: "Test agent",
} as const;

function render(service: AgentProfileService): string {
  return renderToStaticMarkup(
    createElement(
      WalletProvider,
      null,
      createElement(StartTaskFlow, {
        agent,
        services: [service],
      }),
    ),
  );
}

describe("start task forms", () => {
  it("starts A2A tasks with a details and review flow", () => {
    const html = render({
      activationMethod: "a2a",
      availabilityStatus: "available",
      capabilitySummary: {
        skills: [
          {
            description: "Buy assets on a published schedule.",
            id: "dca",
            name: "Dollar-Cost Averaging",
          },
        ],
      },
      endpoint: "https://agent.example/a2a",
      id: "00000000-0000-4000-8000-000000000001",
      metadata: null,
      serviceType: "A2A",
      version: "1.0",
    });

    assert.match(html, /aria-label="Task progress"/);
    assert.match(html, /Review task/);
    assert.match(html, /Capability/);
    assert.match(html, /Dollar-Cost Averaging/);
    assert.match(html, /Task details/);
  });

  it("starts MCP tools with schema fields followed by review", () => {
    const html = render({
      activationMethod: "mcp",
      availabilityStatus: "available",
      capabilitySummary: {
        tools: [
          {
            inputSchema: {
              properties: {
                chainId: { type: "integer" },
                tokenId: {
                  description: "Position token ID",
                  type: "string",
                },
              },
              required: ["tokenId"],
              type: "object",
            },
            name: "inspect",
            readOnly: true,
          },
        ],
      },
      endpoint: "https://agent.example/mcp",
      id: "00000000-0000-4000-8000-000000000002",
      metadata: null,
      serviceType: "MCP",
      version: "2025-06-18",
    });

    assert.match(html, /aria-label="Task progress"/);
    assert.match(html, /Review request/);
    assert.match(html, />Inspect</);
    assert.doesNotMatch(html, /Inspect —/);
    assert.match(html, /Only fields declared by the agent are shown/);
    assert.match(html, /Chain ID/);
    assert.match(html, /Token ID/);
    assert.doesNotMatch(html, /JSON format/);
  });

  it("flags an MCP tool that will require confirmation during review", () => {
    const html = render({
      activationMethod: "mcp",
      availabilityStatus: "available",
      capabilitySummary: {
        tools: [{ inputSchema: { type: "object" }, name: "borrow", readOnly: false }],
      },
      endpoint: "https://agent.example/mcp",
      id: "00000000-0000-4000-8000-000000000003",
      metadata: null,
      serviceType: "MCP",
      version: "2025-06-18",
    });

    assert.match(html, /Confirmation required/);
    assert.match(html, /Review request/);
  });

  it("starts x402 with a live price check before wallet approval", () => {
    const html = render({
      activationMethod: "x402",
      availabilityStatus: "available",
      capabilitySummary: {
        options: [
          {
            amount: "1000000",
            asset: "0x0000000000000000000000000000000000000001",
            network: "eip155:56",
            payTo: "0x0000000000000000000000000000000000000002",
          },
        ],
      },
      endpoint: "https://agent.example/paid-task",
      id: "00000000-0000-4000-8000-000000000004",
      metadata: null,
      serviceType: "x402",
      version: "1",
    });

    assert.match(html, /aria-label="Task progress"/);
    assert.match(html, /Check current price/);
    assert.match(html, /asks your wallet before the provider can collect it/);
    assert.doesNotMatch(html, /Payment execution is not enabled yet/);
  });
});
