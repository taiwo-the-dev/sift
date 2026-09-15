import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  publicApiError,
  publicApiJson,
  publicApiOptions,
} from "../../lib/public-api/http";

describe("public API HTTP responses", () => {
  it("uses a versioned success envelope and read-only CORS headers", async () => {
    const response = publicApiJson({ ok: true });
    const body = await response.json();

    assert.deepEqual(body.data, { ok: true });
    assert.equal(body.meta.apiVersion, "v1");
    assert.equal(response.headers.get("access-control-allow-origin"), "*");
    assert.equal(response.headers.get("cache-control"), "no-store");
  });

  it("uses machine-readable errors without exposing internal details", async () => {
    const response = publicApiError("invalid_query", "Invalid query.", 400);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.deepEqual(body.error, {
      code: "invalid_query",
      message: "Invalid query.",
    });
  });

  it("answers browser preflight requests for GET only", () => {
    const response = publicApiOptions();

    assert.equal(response.status, 204);
    assert.equal(
      response.headers.get("access-control-allow-methods"),
      "GET, OPTIONS",
    );
  });
});
