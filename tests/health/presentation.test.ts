import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatHealthCheckTime } from "../../features/health/presentation";

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
});
