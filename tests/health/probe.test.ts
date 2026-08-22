import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { probeHealthEndpoint } from "../../features/health/probe";
import type { HealthProbeTarget } from "../../features/health/model";

const publicResolver = async () => [{ address: "93.184.216.34", family: 4 }];
const target: HealthProbeTarget = {
  checkedEndpoint: "https://agent.public/health",
  endpointHash: "a".repeat(64),
  kind: "health-endpoint",
  serviceType: "health",
};

const baseOptions = {
  maxBytes: 1_024,
  resolveHost: publicResolver,
  retries: 0,
  timeoutMs: 50,
};

describe("bounded health probing", () => {
  it("records a successful response and measured latency", async () => {
    const times = [100, 142];
    const result = await probeHealthEndpoint(target, {
      ...baseOptions,
      clock: () => times.shift() ?? 142,
      fetchImpl: async () =>
        new Response("ok", {
          headers: { "content-type": "text/plain" },
          status: 200,
        }),
    });

    assert.equal(result.status, "online");
    assert.equal(result.outcome, "success");
    assert.equal(result.responseTimeMs, 42);
    assert.equal(result.wasProbed, true);
  });

  it("requires a bounded JSON object from an A2A agent-card endpoint", async () => {
    const a2aTarget: HealthProbeTarget = {
      ...target,
      checkedEndpoint:
        "https://agent.public/.well-known/agent-card.json",
      kind: "a2a-card",
      serviceType: "A2A",
    };
    const valid = await probeHealthEndpoint(a2aTarget, {
      ...baseOptions,
      fetchImpl: async () =>
        Response.json({ name: "Real response fixture" }),
    });
    const invalid = await probeHealthEndpoint(a2aTarget, {
      ...baseOptions,
      fetchImpl: async () => new Response("not json", { status: 200 }),
    });

    assert.equal(valid.outcome, "success");
    assert.equal(invalid.outcome, "invalid-response");
    assert.equal(invalid.status, "unknown");
  });

  it("blocks private DNS answers and redirect escapes without fetching them", async () => {
    let requests = 0;
    const blocked = await probeHealthEndpoint(target, {
      ...baseOptions,
      fetchImpl: async () => {
        requests += 1;
        return new Response("ok");
      },
      resolveHost: async () => [{ address: "127.0.0.1", family: 4 }],
    });
    const redirected = await probeHealthEndpoint(target, {
      ...baseOptions,
      fetchImpl: async () => {
        requests += 1;
        return new Response(null, {
          headers: { location: "http://127.0.0.1/private" },
          status: 302,
        });
      },
    });

    assert.equal(blocked.outcome, "unsafe-endpoint");
    assert.equal(redirected.outcome, "unsafe-endpoint");
    assert.equal(requests, 1);
  });

  it("separates client, server, oversized, timeout, and network outcomes", async () => {
    const clientError = await probeHealthEndpoint(target, {
      ...baseOptions,
      fetchImpl: async () => new Response(null, { status: 404 }),
    });
    const serverError = await probeHealthEndpoint(target, {
      ...baseOptions,
      fetchImpl: async () => new Response(null, { status: 503 }),
    });
    const oversized = await probeHealthEndpoint(target, {
      ...baseOptions,
      fetchImpl: async () =>
        new Response("x", {
          headers: { "content-length": "99999" },
        }),
    });
    const timeout = await probeHealthEndpoint(target, {
      ...baseOptions,
      fetchImpl: async () => new Promise<Response>(() => undefined),
      timeoutMs: 5,
    });
    const network = await probeHealthEndpoint(target, {
      ...baseOptions,
      fetchImpl: async () => {
        throw new Error("connection refused");
      },
    });

    assert.deepEqual(
      [clientError.outcome, clientError.status],
      ["http-client-error", "unknown"],
    );
    assert.deepEqual(
      [serverError.outcome, serverError.status],
      ["http-server-error", "degraded"],
    );
    assert.equal(oversized.outcome, "response-too-large");
    assert.equal(timeout.outcome, "timeout");
    assert.equal(network.outcome, "network-error");
  });

  it("retries only within the configured bound", async () => {
    let requests = 0;
    const result = await probeHealthEndpoint(target, {
      ...baseOptions,
      fetchImpl: async () => {
        requests += 1;
        return requests === 1
          ? new Response(null, { status: 503 })
          : new Response("ok", { status: 200 });
      },
      retries: 1,
    });

    assert.equal(requests, 2);
    assert.equal(result.outcome, "success");
  });
});
