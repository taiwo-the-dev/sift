import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";

import { buildMcpActionAuthorizationMessage } from "../../features/activation/action-authorization";
import { hashMcpToolArguments } from "../../lib/db/mcp-action-authorization-repository";

describe("MCP action authorization", () => {
  it("binds one wallet signature to the exact agent, service, tool and arguments", () => {
    const argumentsHash = hashMcpToolArguments({
      amount: "1.5",
      nested: { asset: "USDT", chainId: 56 },
    });
    assert.equal(
      argumentsHash,
      hashMcpToolArguments({
        nested: { chainId: 56, asset: "USDT" },
        amount: "1.5",
      }),
    );

    const message = buildMcpActionAuthorizationMessage({
      agentId: "344121",
      argumentsHash,
      chainId: 56,
      expiresAt: "2026-09-13T12:05:00.000Z",
      issuedAt: "2026-09-13T12:00:00.000Z",
      nonce: "one-time-token",
      origin: "https://sift.example",
      serviceId: "11111111-1111-4111-8111-111111111111",
      toolName: "rebalance",
      walletAddress: "0x0000000000000000000000000000000000000001",
    });

    assert.match(message, /Approve one non-read-only agent tool request/);
    assert.match(message, /Chain ID: 56/);
    assert.match(message, /Agent ID: 344121/);
    assert.match(message, /Tool: rebalance/);
    assert.match(message, new RegExp(`Request digest: ${argumentsHash}`));
    assert.match(message, /one request only/);
    assert.match(message, /does not submit a blockchain transaction/);
  });

  it("rejects tool arguments nested deeply enough to exhaust the server", () => {
    let value: Readonly<Record<string, unknown>> = { value: true };
    for (let depth = 0; depth < 40; depth += 1) {
      value = { nested: value };
    }

    assert.throws(() => hashMcpToolArguments(value), /nested too deeply/);
  });

  it("creates a protected, expiring, single-use authorization table", async () => {
    const migration = await readFile(
      new URL(
        "../../supabase/migrations/20260913120000_add_mcp_action_authorizations.sql",
        import.meta.url,
      ),
      "utf8",
    );

    assert.match(migration, /create table public\.mcp_action_authorizations/i);
    assert.match(migration, /consumed_at timestamptz/i);
    assert.match(migration, /enable row level security/i);
    assert.match(
      migration,
      /revoke all on table public\.mcp_action_authorizations from public, anon, authenticated/i,
    );
    assert.match(migration, /grant select, insert, update, delete[\s\S]+to service_role/i);
    assert.doesNotMatch(migration, /insert into public\.mcp_action_authorizations/i);
  });
});
