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
    reliability: 67,
    reputation: null,
    trackRecord: null,
  },
  confidence: 0.65,
  score: 52.25,
  sourceFreshness: {
    healthAt: "2026-08-22T11:00:00.000Z",
    metadataAt: "2026-08-22T10:00:00.000Z",
    reputationAt: null,
  },
  version: "sift-evidence-v2.2.0",
};

const presentationAsOf = new Date("2026-08-22T12:00:00.000Z");

describe("Sift Score presentation", () => {
  const ratingInput = {
    active: true,
    description: "A complete agent profile.",
    health: {
      checkCount: 3,
      checkedEndpoint: "https://agent.example/a2a",
      failureCount: 0,
      lastCheckedAt: "2026-08-22T11:00:00.000Z",
      lastSuccessAt: "2026-08-22T11:00:00.000Z",
      outcome: "success" as const,
      responseTimeMs: 50,
      serviceType: "A2A",
      status: "online" as const,
      successCount: 3,
    },
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
    assert.equal(
      rows.reduce((total, row) => total + (row.contribution ?? 0), 0),
      score.score,
    );
  });

  it("keeps a stored direct-sum assessment labelled as a Sift Score", () => {
    const result = getAgentRating({ ...ratingInput, score }, presentationAsOf);

    assert.equal(result.coverage, 0.65);
    assert.equal(result.detail, "65% data coverage");
    assert.equal(result.kind, "verified");
    assert.equal(result.label, "Sift Score");
    assert.equal(result.profileCompleteness, 77.5);
    assert.equal(result.value, 52.25);
    assert.deepEqual(result.components, score.components);
  });

  it("shows the direct component sum even when the stored score was withheld", () => {
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
    }, presentationAsOf);

    assert.equal(result.kind, "verified");
    assert.equal(result.label, "Sift Score");
    assert.equal(result.value, 20);
    assert.equal(result.coverage, 0.2);
    assert.equal(result.components.availability, 100);
  });

  it("calculates a numeric score for an agent without a stored assessment", () => {
    const result = getAgentRating(
      { ...ratingInput, score: null },
      presentationAsOf,
    );

    assert.equal(result.kind, "calculated");
    assert.equal(result.label, "Sift Score");
    assert.equal(result.value, 62);
    assert.equal(result.profileCompleteness, 85);
    assert.equal(result.coverage, 0.65);
    assert.match(result.detail, /calculated from available evidence/i);
  });

  it("uses zero profile completeness when no profile evidence is verified", () => {
    const result = getAgentRating({
      ...ratingInput,
      metadataStatus: "invalid",
      score: null,
    }, presentationAsOf);

    assert.equal(result.kind, "calculated");
    assert.equal(result.value, 45);
    assert.equal(result.profileCompleteness, 0);
    assert.equal(result.coverage, 0.45);
  });

  it("recalculates a retired v1 assessment from current page evidence", () => {
    const result = getAgentRating({
      ...ratingInput,
      score: { ...score, version: "sift-evidence-v1.0.0" },
    }, presentationAsOf);

    assert.equal(result.kind, "calculated");
    assert.equal(result.value, 62);
    assert.match(result.detail, /calculated from available evidence/i);
  });

  it("keeps a stale v2 value visible only as a last known assessment", () => {
    const result = getAgentRating(
      { ...ratingInput, score },
      new Date("2026-08-23T12:00:00.001Z"),
    );

    assert.equal(result.kind, "stale");
    assert.equal(result.label, "Score needs updating");
    assert.equal(result.value, 52.25);
    assert.match(result.detail, /last known assessment/i);
  });
});
