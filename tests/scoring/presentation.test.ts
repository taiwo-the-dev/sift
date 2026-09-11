import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PersistedSiftScore } from "../../features/scoring/model";
import {
  describeScoreConfidence,
  describeScoreTier,
  formatScoreConfidence,
  isScoreStale,
  scoreComponentRows,
} from "../../features/scoring/presentation";

const score: PersistedSiftScore = {
  calculatedAt: "2026-08-22T11:00:00.000Z",
  components: {
    availability: 100,
    capability: 70,
    metadata: 85,
    reliability: null,
    reputation: null,
    trackRecord: null,
  },
  confidence: 0.4,
  score: 82.5,
  sourceFreshness: {
    healthAt: "2026-08-22T11:00:00.000Z",
    metadataAt: "2026-08-22T10:00:00.000Z",
    reputationAt: null,
  },
  version: "sift-evidence-v1.0.0",
};

describe("Sift Score presentation", () => {
  it("labels confidence without implying certainty", () => {
    assert.equal(describeScoreConfidence(0), "Not enough data");
    assert.equal(describeScoreConfidence(0.4), "Low confidence");
    assert.equal(describeScoreConfidence(0.6), "Moderate confidence");
    assert.equal(describeScoreConfidence(0.9), "High confidence");
    assert.equal(formatScoreConfidence(0.4), "40% data coverage");
  });

  it("uses the exact 24-hour freshness boundary", () => {
    assert.equal(
      isScoreStale(
        "2026-08-21T12:00:00.000Z",
        new Date("2026-08-22T12:00:00.000Z"),
      ),
      false,
    );
    assert.equal(
      isScoreStale(
        "2026-08-21T11:59:59.999Z",
        new Date("2026-08-22T12:00:00.000Z"),
      ),
      true,
    );
    assert.equal(
      isScoreStale(
        "2026-08-22T12:00:00.001Z",
        new Date("2026-08-22T12:00:00.000Z"),
      ),
      true,
    );
  });

  it("tiers a score without implying safety or performance", () => {
    assert.equal(describeScoreTier(null).tier, "unavailable");
    assert.equal(describeScoreTier(39.99).tier, "weak");
    assert.equal(describeScoreTier(40).tier, "fair");
    assert.equal(describeScoreTier(59.99).tier, "fair");
    assert.equal(describeScoreTier(60).tier, "good");
    assert.equal(describeScoreTier(79.99).tier, "good");
    assert.equal(describeScoreTier(80).tier, "excellent");
  });

  it("exposes every weighted component including unavailable evidence", () => {
    const rows = scoreComponentRows(score);

    assert.equal(rows.length, 6);
    assert.equal(rows.find((row) => row.key === "availability")?.contribution, 20);
    assert.equal(rows.find((row) => row.key === "reputation")?.value, null);
  });
});
