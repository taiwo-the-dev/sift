import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  a2aCardUrl,
  callMcpTool,
  callReadOnlyMcpTool,
  extractPreparedEvmTransactions,
  inspectA2aService,
  inspectMcpService,
  inspectX402Service,
  sendA2aTask,
} from "../../features/activation/protocol";
import type { HostResolver } from "../../lib/indexer/metadata/url-safety";

const resolvePublicTestHost: HostResolver = async () => [
  { address: "93.184.216.34", family: 4 },
];

function rpc(result: unknown, id: number | string = 1): Response {
  return Response.json({ id, jsonrpc: "2.0", result });
}

describe("bounded agent task protocols", () => {
  it("preserves an explicitly published agent-specific A2A card URL", () => {
    assert.equal(
      a2aCardUrl("https://agent.example/agents/193/agent-card.json"),
      "https://agent.example/agents/193/agent-card.json",
    );
    assert.equal(
      a2aCardUrl("https://agent.example/api/a2a"),
      "https://agent.example/.well-known/agent-card.json",
    );
  });

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

  it("binds an A2A message to the selected identity and declared card route", async () => {
    const requests: unknown[] = [];
    const responses = [
      Response.json({
        name: "Bound agent",
        registrations: [
          {
            agentId: 193,
            agentRegistry:
              "eip155:56:0x039D7d0096d2989647133f9676f2b341e602d2fF",
          },
          {
            agentId: 150527,
            agentRegistry:
              "eip155:56:0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
          },
        ],
        skills: [
          {
            description: "Buy assets on a schedule.",
            id: "dca",
            name: "Dollar-Cost Averaging",
          },
        ],
        url: "https://agent.example/api/a2a",
      }),
      rpc({ kind: "message" }, "sift-check"),
      rpc({ kind: "message", parts: [{ kind: "text", text: "Bound reply" }] }),
    ];
    const result = await sendA2aTask({
      agent: {
        agentId: "150527",
        chainId: 56,
        registryAddress: "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432",
      },
      endpoint: "https://agent.example/agents/193/agent-card.json",
      fetchImpl: async (_url, init) => {
        if (init?.body) requests.push(JSON.parse(String(init.body)) as unknown);
        return responses.shift()!;
      },
      message: "Explain this strategy",
      resolveHost: resolvePublicTestHost,
      skillId: "dca",
    });

    const sent = requests[1] as {
      params: { message: { metadata: Record<string, unknown>; parts: unknown[] } };
    };
    assert.equal(sent.params.message.metadata.agentId, "150527");
    assert.equal(sent.params.message.metadata.chainId, 56);
    assert.equal(sent.params.message.metadata.nfaTokenId, 193);
    assert.equal(sent.params.message.metadata.skillId, "dca");
    assert.deepEqual(sent.params.message.parts, [
      { kind: "text", text: "Explain this strategy" },
    ]);
    assert.deepEqual(result, {
      kind: "message",
      parts: [{ kind: "text", text: "Bound reply" }],
    });
  });

  it("does not send a stale capability ID after reloading the live A2A card", async () => {
    const requests: unknown[] = [];
    const responses = [
      Response.json({
        name: "Changing agent",
        skills: [{ id: "current", name: "Current capability" }],
        url: "https://agent.example/api/a2a",
      }),
      rpc({ kind: "message" }, "sift-check"),
      rpc({ kind: "message", parts: [{ kind: "text", text: "Live reply" }] }),
    ];

    await sendA2aTask({
      agent: {
        agentId: "8",
        chainId: 56,
        registryAddress: "0x8004a169fb4a3325136eb29fa0ceb6d2e539a432",
      },
      endpoint: "https://agent.example/a2a",
      fetchImpl: async (_url, init) => {
        if (init?.body) requests.push(JSON.parse(String(init.body)) as unknown);
        return responses.shift()!;
      },
      message: "Use the current capability",
      resolveHost: resolvePublicTestHost,
      skillId: "former-capability",
    });

    const sent = requests[1] as {
      params: { message: { metadata: Record<string, unknown> } };
    };
    assert.equal(sent.params.message.metadata.skillId, undefined);
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
