import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { HealthSnapshot } from "../../features/health/model";
import { applyHealthObservation } from "../../features/health/transition";

const previous: HealthSnapshot = {
  checkCount: 4,
  checkedEndpoint: "https://agent.public/health",
  endpointHash: "a".repeat(64),
  failureCount: 1,
  lastCheckedAt: "2026-08-22T09:00:00.000Z",
  lastSuccessAt: "2026-08-22T08:00:00.000Z",
  outcome: "timeout",
  responseTimeMs: null,
  serviceType: "health",
  status: "offline",
  successCount: 3,
};

describe("health history transitions", () => {
  it("increments successful evidence and clears consecutive failures", () => {
    const next = applyHealthObservation(
      previous,
      {
        checkedEndpoint: previous.checkedEndpoint,
        endpointHash: previous.endpointHash,
        outcome: "success",
        responseTimeMs: 81,
        serviceType: "health",
        status: "online",
        wasProbed: true,
      },
      "2026-08-22T10:00:00.000Z",
    );

    assert.equal(next.checkCount, 5);
    assert.equal(next.successCount, 4);
    assert.equal(next.failureCount, 0);
    assert.equal(next.lastSuccessAt, "2026-08-22T10:00:00.000Z");
  });

  it("preserves last success after a failure and bounds failure history", () => {
    const next = applyHealthObservation(
      { ...previous, failureCount: 100 },
      {
        checkedEndpoint: previous.checkedEndpoint,
        endpointHash: previous.endpointHash,
        outcome: "timeout",
        responseTimeMs: null,
        serviceType: "health",
        status: "offline",
        wasProbed: true,
      },
      "2026-08-22T10:00:00.000Z",
    );

    assert.equal(next.lastSuccessAt, previous.lastSuccessAt);
    assert.equal(next.failureCount, 100);
    assert.equal(next.checkCount, 5);
    assert.equal(next.successCount, 3);
  });

  it("does not count an unsupported declaration as a network probe", () => {
    const next = applyHealthObservation(
      previous,
      {
        checkedEndpoint: null,
        endpointHash: null,
        outcome: "unsupported-service",
        responseTimeMs: null,
        serviceType: "MCP",
        status: "unknown",
        wasProbed: false,
      },
      "2026-08-22T10:00:00.000Z",
    );

    assert.equal(next.checkCount, 0);
    assert.equal(next.successCount, 0);
    assert.equal(next.lastSuccessAt, previous.lastSuccessAt);
  });

  it("compacts history before exceeding the database cap", () => {
    const next = applyHealthObservation(
      { ...previous, checkCount: 1_000, successCount: 800 },
      {
        checkedEndpoint: previous.checkedEndpoint,
        endpointHash: previous.endpointHash,
        outcome: "success",
        responseTimeMs: 10,
        serviceType: "health",
        status: "online",
        wasProbed: true,
      },
      "2026-08-22T10:00:00.000Z",
    );

    assert.equal(next.checkCount, 501);
    assert.equal(next.successCount, 401);
  });
});
