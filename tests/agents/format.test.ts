import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatAddress,
  formatProfileTimestamp,
  formatResponseTime,
} from "../../features/agents/format";

describe("agent profile formatting", () => {
  it("formats identifiers and timestamps without locale ambiguity", () => {
    assert.equal(
      formatAddress("0x1111111111111111111111111111111111111111"),
      "0x111111…111111",
    );
    assert.match(
      formatProfileTimestamp("2026-08-22T10:00:00.000Z"),
      /Aug 22, 2026.*UTC/,
    );
    assert.equal(formatResponseTime(125), "125 ms");
  });

  it("uses explicit unavailable labels for malformed or missing values", () => {
    assert.equal(formatAddress(null), "Not available");
    assert.equal(formatProfileTimestamp("not-a-date"), "Not available");
    assert.equal(formatResponseTime(null), "Not available");
  });
});
