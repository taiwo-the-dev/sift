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
    assert.match(headers.get("permissions-policy") ?? "", /camera=\(\)/);
    assert.match(
      headers.get("content-security-policy") ?? "",
      /frame-ancestors 'none'/,
    );
    assert.doesNotMatch(
      headers.get("content-security-policy") ?? "",
      /script-src|connect-src/,
    );
  });
});
