import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { securityHeaders } from "../../next.config";

describe("production security headers", () => {
  it("sets a wallet-compatible browser security baseline", () => {
    const headers = new Map(
      securityHeaders.map(({ key, value }) => [key.toLowerCase(), value]),
    );

    assert.equal(headers.get("x-content-type-options"), "nosniff");
    assert.equal(headers.get("x-frame-options"), "DENY");
    assert.equal(
      headers.get("cross-origin-opener-policy"),
      "same-origin-allow-popups",
    );
    assert.equal(headers.get("cross-origin-resource-policy"), "same-origin");
    assert.equal(headers.get("origin-agent-cluster"), "?1");
    assert.match(headers.get("permissions-policy") ?? "", /camera=\(\)/);
    const policy = headers.get("content-security-policy") ?? "";
    assert.match(policy, /default-src 'self'/);
    assert.match(policy, /script-src 'self'/);
    assert.match(policy, /connect-src 'self' https: wss:/);
    assert.match(policy, /frame-ancestors 'none'/);
    assert.match(policy, /object-src 'none'/);
  });
});
