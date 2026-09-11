import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateExpiry,
  formatTokenAmount,
  maximumSpendToBaseUnits,
  parseHiringMission,
} from "../../features/hiring/validation";

const validMission = {
  deliverables: "A public test-only evidence report.",
  durationSeconds: 86_400,
  maxSpend: "1.25",
  mission: "Observe the test-only position and report verifiable risk signals.",
  qualityStandards: "Cite public evidence and mark unavailable values honestly.",
};

describe("hiring mission validation", () => {
  it("normalizes bounded mission fields and converts token amounts exactly", () => {
    const result = parseHiringMission({
      ...validMission,
      mission: `  ${validMission.mission}\r\n`,
    }, 56);

    assert.equal(result.mission, validMission.mission);
    assert.equal(maximumSpendToBaseUnits("1.25", 56), 1_250_000_000_000_000_000n);
    assert.equal(formatTokenAmount(1_250_000_000_000_000_000n, 18), "1.25");
  });

  it("rejects unsupported durations, excessive spend, floats with excess precision, and control characters", () => {
    assert.throws(() => parseHiringMission({ ...validMission, durationSeconds: 60 }, 56));
    assert.throws(() => parseHiringMission({ ...validMission, maxSpend: "1000.01" }, 56));
    assert.throws(() => parseHiringMission({ ...validMission, maxSpend: "0.0000000000000000001" }, 56));
    assert.throws(() => parseHiringMission({ ...validMission, mission: `${validMission.mission}\u0000` }, 56));
  });

  it("uses the same exact amount rules for the verified mainnet token", () => {
    assert.equal(maximumSpendToBaseUnits("1.25", 56), 1_250_000_000_000_000_000n);
    assert.equal(parseHiringMission(validMission, 56).maxSpend, "1.25");
  });

  it("calculates a whole-second expiry from a deterministic clock", () => {
    assert.equal(
      calculateExpiry(7_200, Date.parse("2026-08-23T10:00:00.987Z")).toISOString(),
      "2026-08-23T12:00:00.000Z",
    );
  });
});
