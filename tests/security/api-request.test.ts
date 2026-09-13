import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ApiRequestError,
  isSameOriginRequest,
  MemoryRateLimiter,
  readBoundedJson,
} from "../../lib/security/api-request";

describe("API request security", () => {
  it("rate-limits a burst and refills it over the configured window", () => {
    const limiter = new MemoryRateLimiter();
    const policy = { capacity: 2, namespace: "test", windowMs: 1_000 };

    assert.equal(limiter.consume("visitor", policy, 0).allowed, true);
    assert.equal(limiter.consume("visitor", policy, 0).allowed, true);
    const blocked = limiter.consume("visitor", policy, 0);
    assert.equal(blocked.allowed, false);
    assert.equal(blocked.retryAfterSeconds, 1);
    assert.equal(limiter.consume("visitor", policy, 500).allowed, true);
  });

  it("keeps independent API and visitor buckets separate", () => {
    const limiter = new MemoryRateLimiter();
    const first = { capacity: 1, namespace: "first", windowMs: 60_000 };
    const second = { ...first, namespace: "second" };

    assert.equal(limiter.consume("one", first, 0).allowed, true);
    assert.equal(limiter.consume("one", first, 0).allowed, false);
    assert.equal(limiter.consume("two", first, 0).allowed, true);
    assert.equal(limiter.consume("one", second, 0).allowed, true);
  });

  it("requires an exact same-origin browser request", () => {
    assert.equal(
      isSameOriginRequest(
        new Request("https://sift.example/api/task", {
          headers: { origin: "https://sift.example", "sec-fetch-site": "same-origin" },
        }),
      ),
      true,
    );
    assert.equal(
      isSameOriginRequest(
        new Request("https://sift.example/api/task", {
          headers: { origin: "https://attacker.example", "sec-fetch-site": "cross-site" },
        }),
      ),
      false,
    );
    assert.equal(
      isSameOriginRequest(new Request("https://sift.example/api/task")),
      false,
    );
  });

  it("reads valid bounded JSON and rejects streamed oversized bodies", async () => {
    const valid = new Request("https://sift.example/api/task", {
      body: JSON.stringify({ task: "inspect" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    assert.deepEqual(await readBoundedJson(valid, 100), { task: "inspect" });

    const oversized = new Request("https://sift.example/api/task", {
      body: JSON.stringify({ task: "x".repeat(100) }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    await assert.rejects(
      () => readBoundedJson(oversized, 32),
      (error: unknown) =>
        error instanceof ApiRequestError && error.status === 413,
    );
  });

  it("rejects non-JSON and malformed JSON requests", async () => {
    await assert.rejects(
      () =>
        readBoundedJson(
          new Request("https://sift.example/api/task", {
            body: "hello",
            headers: { "content-type": "text/plain" },
            method: "POST",
          }),
          100,
        ),
      (error: unknown) =>
        error instanceof ApiRequestError && error.status === 415,
    );

    await assert.rejects(
      () =>
        readBoundedJson(
          new Request("https://sift.example/api/task", {
            body: "{",
            headers: { "content-type": "application/json" },
            method: "POST",
          }),
          100,
        ),
      (error: unknown) =>
        error instanceof ApiRequestError && error.status === 400,
    );
  });
});
