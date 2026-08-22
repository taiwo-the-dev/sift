import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAgentImageProxyUrl,
  normalizeAgentImageUrl,
} from "../../features/discovery/image";

describe("agent image URL handling", () => {
  it("accepts public HTTPS sources and routes them through Sift", () => {
    const source = "https://images.example.com/agent.png?version=2";
    const proxyUrl = buildAgentImageProxyUrl(source);

    assert.equal(normalizeAgentImageUrl(source), source);
    assert.ok(proxyUrl?.startsWith("/api/agent-image?"));
    assert.equal(
      new URL(proxyUrl ?? "", "https://sift.example").searchParams.get("url"),
      source,
    );
  });

  it("rejects unsafe, private and unsupported sources", () => {
    assert.equal(normalizeAgentImageUrl("http://images.example.com/a.png"), null);
    assert.equal(normalizeAgentImageUrl("https://localhost/a.png"), null);
    assert.equal(normalizeAgentImageUrl("https://127.0.0.1/a.png"), null);
    assert.equal(normalizeAgentImageUrl("https://user:pass@example.com/a.png"), null);
    assert.equal(normalizeAgentImageUrl("data:image/png;base64,abc"), null);
    assert.equal(normalizeAgentImageUrl(null), null);
  });
});
