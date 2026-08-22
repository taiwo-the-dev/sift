import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AgentImageError,
  fetchAgentImage,
} from "../../lib/images/agent-image";

const publicResolver = async () => [{ address: "93.184.216.34", family: 4 }];

describe("guarded agent image fetching", () => {
  it("returns a bounded supported image response", async () => {
    const fetchImplementation = (async () =>
      new Response(new Uint8Array([1, 2, 3]), {
        headers: { "content-type": "image/png" },
      })) as typeof fetch;

    const result = await fetchAgentImage("https://images.example.com/agent.png", {
      fetchImplementation,
      resolveHost: publicResolver,
    });

    assert.equal(result.contentType, "image/png");
    assert.deepEqual([...new Uint8Array(result.body)], [1, 2, 3]);
  });

  it("blocks redirects to private hosts", async () => {
    const fetchImplementation = (async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://localhost/private.png" },
      })) as typeof fetch;

    await assert.rejects(
      fetchAgentImage("https://images.example.com/agent.png", {
        fetchImplementation,
        resolveHost: publicResolver,
      }),
      (error: unknown) =>
        error instanceof AgentImageError && error.code === "invalid-source",
    );
  });

  it("rejects unsupported content and oversized responses", async () => {
    const htmlFetch = (async () =>
      new Response("not an image", {
        headers: { "content-type": "text/html" },
      })) as typeof fetch;
    const largeFetch = (async () =>
      new Response(new Uint8Array([1]), {
        headers: {
          "content-length": String(2 * 1024 * 1024 + 1),
          "content-type": "image/png",
        },
      })) as typeof fetch;

    await assert.rejects(
      fetchAgentImage("https://images.example.com/agent.png", {
        fetchImplementation: htmlFetch,
        resolveHost: publicResolver,
      }),
      (error: unknown) =>
        error instanceof AgentImageError && error.code === "unsupported-content",
    );
    await assert.rejects(
      fetchAgentImage("https://images.example.com/agent.png", {
        fetchImplementation: largeFetch,
        resolveHost: publicResolver,
      }),
      (error: unknown) =>
        error instanceof AgentImageError && error.code === "too-large",
    );
  });
});
