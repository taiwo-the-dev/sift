import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatHealthCheckTime,
  getHealthPresentation,
} from "../../features/health/presentation";

describe("health-check presentation", () => {
  it("shows a compact UTC observation time", () => {
    assert.equal(
      formatHealthCheckTime("2026-09-07T21:47:48.433Z"),
      "Sep 7, 21:47 UTC",
    );
  });

  it("does not invent a time for invalid evidence", () => {
    assert.equal(formatHealthCheckTime("invalid"), "time unavailable");
  });

  it("distinguishes an inconclusive check from an agent waiting to be checked", () => {
    const attempted = getHealthPresentation({
      checkCount: 1,
      lastCheckedAt: "2026-09-11T09:11:46.631Z",
      outcome: "invalid-response",
      status: "unknown",
    });
    const waiting = getHealthPresentation(null, [
      { endpoint: "https://agent.example.com", serviceType: "a2a" },
    ]);

    assert.equal(attempted.label, "Couldn’t verify");
    assert.match(attempted.detail, /service response could not be verified/i);
    assert.equal(waiting.label, "Not checked yet");
  });

  it("labels agents without a usable health declaration clearly", () => {
    const missing = getHealthPresentation(null, [
      { endpoint: "https://agent.example.com", serviceType: "mcp" },
    ]);

    assert.equal(missing.label, "No checkable service");
  });
});
