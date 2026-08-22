import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createMetadataClient } from "../../lib/indexer/metadata/fetch";
import { validateAgentMetadata } from "../../lib/indexer/metadata/schema";
import { assertSafeRemoteUrl } from "../../lib/indexer/metadata/url-safety";

const registrationFixture = {
  active: true,
  description: "Deterministic ERC-8004 metadata test fixture.",
  image: "https://agent.example/image.png",
  name: "Fixture Agent",
  registrations: [
    {
      agentId: 7,
      agentRegistry:
        "eip155:97:0x8004A818BFB912233c491871b3d84c89A494BD9e",
    },
  ],
  services: [
    {
      endpoint: "https://agent.example/.well-known/agent-card.json",
      name: "A2A",
      skills: ["fixture-only"],
      version: "0.3.0",
    },
  ],
  type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  x402Support: false,
} as const;

const publicResolver = async () => [
  { address: "93.184.216.34", family: 4 },
];

function clientWith(fetchImpl: typeof fetch, overrides = {}) {
  return createMetadataClient({
    fetchImpl,
    ipfsGatewayUrl: "https://ipfs.io/ipfs/",
    maxBytes: 10_000,
    resolveHost: publicResolver,
    retries: 0,
    timeoutMs: 100,
    ...overrides,
  });
}

describe("ERC-8004 metadata", () => {
  it("validates and normalizes a registration file", async () => {
    assert.equal(validateAgentMetadata(registrationFixture).success, true);
    const encoded = Buffer.from(JSON.stringify(registrationFixture)).toString(
      "base64",
    );
    const result = await clientWith(fetch).fetch(
      `data:application/json;base64,${encoded}`,
    );

    assert.equal(result.status, "valid");

    if (result.status === "valid") {
      assert.equal(result.metadata.name, "Fixture Agent");
      assert.equal(result.metadata.services[0].serviceType, "A2A");
      assert.deepEqual(result.metadata.services[0].metadata, {
        skills: ["fixture-only"],
      });
    }
  });

  it("preserves omitted optional protocol fields as unavailable", async () => {
    const legacyFixture = {
      ...registrationFixture,
      endpoints: registrationFixture.services,
      image: "",
      registrations: [],
      services: undefined,
      x402Support: undefined,
    };
    const encoded = Buffer.from(JSON.stringify(legacyFixture)).toString("base64");
    const result = await clientWith(fetch).fetch(
      `data:application/json;base64,${encoded}`,
    );

    assert.equal(result.status, "valid");

    if (result.status === "valid") {
      assert.equal(result.metadata.imageUrl, null);
      assert.equal(result.metadata.x402Supported, null);
      assert.equal(result.metadata.services[0].serviceType, "A2A");
    }
  });

  it("accepts bounded serialized on-chain JSON and public HTTP metadata", async () => {
    const serialized = await clientWith(fetch).fetch(
      JSON.stringify(registrationFixture),
    );
    const http = await clientWith(async () =>
      new Response(JSON.stringify(registrationFixture), {
        headers: { "content-type": "application/json" },
      }),
    ).fetch("http://agent.example/metadata.json");

    assert.equal(serialized.status, "valid");
    assert.equal(http.status, "valid");
  });

  it("records invalid JSON, schema, and content types honestly", async () => {
    const invalidJson = await clientWith(async () =>
      new Response("not-json", {
        headers: { "content-type": "application/json" },
      }),
    ).fetch("https://agent.example/metadata.json");
    const invalidSchema = await clientWith(async () =>
      new Response("{}", {
        headers: { "content-type": "application/json" },
      }),
    ).fetch("https://agent.example/metadata.json");
    const invalidType = await clientWith(async () =>
      new Response(JSON.stringify(registrationFixture), {
        headers: { "content-type": "text/html" },
      }),
    ).fetch("https://agent.example/metadata.json");

    assert.deepEqual(invalidJson, {
      code: "invalid-json",
      status: "invalid",
    });
    assert.deepEqual(invalidSchema, {
      code: "invalid-schema",
      status: "invalid",
    });
    assert.deepEqual(invalidType, {
      code: "invalid-content-type",
      status: "invalid",
    });
  });

  it("enforces response limits and blocks private redirect targets", async () => {
    const oversized = await clientWith(
      async () =>
        new Response(JSON.stringify(registrationFixture), {
          headers: {
            "content-length": "20000",
            "content-type": "application/json",
          },
        }),
      { maxBytes: 1_024 },
    ).fetch("https://agent.example/metadata.json");
    const redirected = await clientWith(async () =>
      new Response(null, {
        headers: { location: "https://127.0.0.1/private" },
        status: 302,
      }),
    ).fetch("https://agent.example/metadata.json");

    assert.deepEqual(oversized, {
      code: "response-too-large",
      status: "invalid",
    });
    assert.deepEqual(redirected, {
      code: "blocked-host",
      status: "invalid",
    });
    await assert.rejects(() => assertSafeRemoteUrl("https://[::1]/metadata"));
    await assert.rejects(() =>
      assertSafeRemoteUrl("https://[::ffff:7f00:1]/metadata"),
    );
  });

  it("times out stalled responses and retries a transient status", async () => {
    const timedOut = await clientWith(
      async (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
      { timeoutMs: 10 },
    ).fetch("https://agent.example/metadata.json");
    let attempts = 0;
    const retried = await clientWith(
      async () => {
        attempts += 1;
        return attempts === 1
          ? new Response(null, { status: 503 })
          : new Response(JSON.stringify(registrationFixture), {
              headers: { "content-type": "application/json" },
            });
      },
      { retries: 1 },
    ).fetch("https://agent.example/metadata.json");

    assert.deepEqual(timedOut, { code: "timeout", status: "unavailable" });
    assert.equal(retried.status, "valid");
    assert.equal(attempts, 2);
  });
});
