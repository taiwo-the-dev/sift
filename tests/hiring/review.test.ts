import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatBasisPointPercent,
  formatDuration,
  formatReviewAmount,
  hiringExpiryLabel,
} from "../../features/hiring/review";

describe("hiring review formatting", () => {
  it("formats durations, basis points, and integer token amounts without floats", () => {
    assert.equal(formatDuration(7_200), "2 hours");
    assert.equal(formatDuration(86_400), "1 day");
    assert.equal(formatBasisPointPercent(25), "0.25%");
    assert.equal(formatReviewAmount("1250000000000000000", 18, "U"), "1.25 U");
  });

  it("labels on-chain expiry explicitly in UTC", () => {
    assert.match(hiringExpiryLabel("2026-08-24T10:00:00.000Z"), /UTC$/);
    assert.equal(hiringExpiryLabel("not-a-time"), "Invalid expiry");
  });
});
