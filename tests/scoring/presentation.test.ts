import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PersistedSiftScore } from "../../features/scoring/model";
import {
  describeScoreConfidence,
  describeScoreTier,
  formatScoreConfidence,
  getAgentRating,
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
  const ratingInput = {
    active: true,
    description: "A complete agent profile.",
    imageUrl: "https://agent.example/avatar.png",
    lastSyncedAt: "2026-08-22T11:00:00.000Z",
    metadataStatus: "valid" as const,
    name: "Example agent",
    ownerAddress: "0x1111111111111111111111111111111111111111",
    services: [
      {
        endpoint: "https://agent.example/a2a",
        metadata: { declared: true },
        serviceType: "A2A",
        version: "1.0",
      },
    ],
    x402Supported: false,
  };

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

  it("keeps a publishable assessment labelled as a Sift Score", () => {
    assert.deepEqual(getAgentRating({ ...ratingInput, score }), {
      coverage: 0.4,
      detail: "40% data coverage",
      kind: "verified",
      label: "Sift Score",
      value: 82.5,
    });
  });

  it("shows a provisional rating when limited independent evidence exists", () => {
    const result = getAgentRating({
      ...ratingInput,
      score: {
        ...score,
        components: {
          availability: 100,
          capability: null,
          metadata: null,
          reliability: null,
          reputation: null,
          trackRecord: null,
        },
        confidence: 0.2,
        score: null,
      },
    });

    assert.equal(result.kind, "provisional");
    assert.equal(result.label, "Provisional Rating");
    assert.equal(result.value, 100);
    assert.equal(result.coverage, 0.2);
  });

  it("rates published profile details without calling them performance", () => {
    const result = getAgentRating({ ...ratingInput, score: null });

    assert.equal(result.kind, "profile");
    assert.equal(result.label, "Profile Rating");
    assert.equal(result.value, 77.5);
    assert.equal(result.coverage, 0.2);
  });

  it("uses a zero profile rating when no profile evidence is verified", () => {
    const result = getAgentRating({
      ...ratingInput,
      metadataStatus: "invalid",
      score: null,
    });

    assert.equal(result.kind, "profile");
    assert.equal(result.value, 0);
    assert.equal(result.coverage, 0);
    assert.equal(result.detail, "No verified profile information");
  });
});
