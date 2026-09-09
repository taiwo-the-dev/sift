import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  callMcpTool,
  callReadOnlyMcpTool,
  extractPreparedEvmTransactions,
  inspectA2aService,
  inspectMcpService,
  inspectX402Service,
} from "../../features/activation/protocol";
import type { HostResolver } from "../../lib/indexer/metadata/url-safety";

const resolvePublicTestHost: HostResolver = async () => [
  { address: "93.184.216.34", family: 4 },
];

function rpc(result: unknown, id = 1): Response {
  return Response.json({ id, jsonrpc: "2.0", result });
}

describe("bounded agent task protocols", () => {
  it("discovers MCP tools and keeps read-only annotations explicit", async () => {
    const responses = [
      rpc({ protocolVersion: "2025-06-18", serverInfo: { name: "agent", version: "1" } }),
      new Response(null, { status: 202 }),
      rpc({
        tools: [
          { annotations: { readOnlyHint: true }, inputSchema: { type: "object" }, name: "inspect" },
          { inputSchema: { type: "object" }, name: "trade" },
        ],
      }, 2),
    ];
    const inspection = await inspectMcpService("https://agent.example/mcp", {
      fetchImpl: async () => responses.shift()!,
      resolveHost: resolvePublicTestHost,
    });
    assert.deepEqual(
      inspection.tools.map((tool) => [tool.name, tool.readOnly]),
      [["inspect", true], ["trade", false]],
    );
  });

  it("revalidates MCP and blocks a tool without a read-only declaration", async () => {
    const responses = [
      rpc({ protocolVersion: "2025-06-18" }),
      new Response(null, { status: 202 }),
      rpc({ tools: [{ inputSchema: { type: "object" }, name: "trade" }] }, 2),
    ];
    await assert.rejects(
      callReadOnlyMcpTool({
        arguments: {},
        endpoint: "https://agent.example/mcp",
        fetchImpl: async () => responses.shift()!,
        resolveHost: resolvePublicTestHost,
        toolName: "trade",
      }),
      /Confirm this external action/,
    );
  });

  it("runs a non-read-only MCP tool only after explicit confirmation", async () => {
    const responses = [
      rpc({ protocolVersion: "2025-06-18" }),
      new Response(null, { status: 202 }),
      rpc({ tools: [{ inputSchema: { type: "object" }, name: "prepare" }] }, 2),
      rpc({
        content: [{
          text: JSON.stringify({
            chainId: 56,
            data: "0x1234",
            to: "0x1111111111111111111111111111111111111111",
            value: "0",
          }),
          type: "text",
        }],
      }, 3),
    ];
    const result = await callMcpTool({
      arguments: {},
      confirmedSideEffects: true,
      endpoint: "https://agent.example/mcp",
      expectedChainId: 56,
      fetchImpl: async () => responses.shift()!,
      resolveHost: resolvePublicTestHost,
      toolName: "prepare",
    });
    assert.equal(result.tool.readOnly, false);
    assert.equal(result.transactions.length, 1);
    assert.equal(result.transactions[0]?.chainId, 56);
  });

  it("rejects prepared transactions for a different chain", () => {
    assert.deepEqual(
      extractPreparedEvmTransactions(
        {
          chainId: 1,
          data: "0x1234",
          to: "0x1111111111111111111111111111111111111111",
        },
        56,
      ),
      [],
    );
  });

  it("validates an A2A card and its JSON-RPC task transport", async () => {
    const responses = [
      Response.json({
        name: "Guardian",
        skills: [{ id: "health", name: "Health check" }],
        url: "https://agent.example/a2a",
      }),
      Response.json({
        error: { code: -32001, message: "Task not found" },
        id: "sift-check",
        jsonrpc: "2.0",
      }),
    ];
    const result = await inspectA2aService("https://agent.example/a2a", {
      fetchImpl: async () => responses.shift()!,
      resolveHost: resolvePublicTestHost,
    });
    assert.equal(result.card.name, "Guardian");
    assert.equal(result.card.skills[0]?.id, "health");
  });

  it("accepts only an exact x402 option on the indexed BNB chain", async () => {
    const challenge = Buffer.from(
      JSON.stringify({
        accepts: [
          {
            amount: "1000",
            asset: "0x1111111111111111111111111111111111111111",
            network: "eip155:56",
            payTo: "0x2222222222222222222222222222222222222222",
            scheme: "exact",
          },
        ],
      }),
    ).toString("base64");
    const result = await inspectX402Service("https://agent.example/paid", 56, {
      fetchImpl: async () =>
        new Response("", {
          headers: { "payment-required": challenge },
          status: 402,
        }),
      resolveHost: resolvePublicTestHost,
    });
    assert.equal(result.free, false);
    assert.equal(result.options[0]?.amount, "1000");
  });

  it("rejects x402 options with a non-exact payment scheme", async () => {
    const challenge = Buffer.from(
      JSON.stringify({
        accepts: [
          {
            amount: "1000",
            asset: "0x1111111111111111111111111111111111111111",
            network: "eip155:56",
            payTo: "0x2222222222222222222222222222222222222222",
            scheme: "upto",
          },
        ],
      }),
    ).toString("base64");
    await assert.rejects(
      inspectX402Service("https://agent.example/paid", 56, {
        fetchImpl: async () =>
          new Response("", {
            headers: { "payment-required": challenge },
            status: 402,
          }),
        resolveHost: resolvePublicTestHost,
      }),
      /No x402 option matches/,
    );
  });
});
