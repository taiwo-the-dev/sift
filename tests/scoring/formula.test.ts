import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  calculateSiftScore,
  MINIMUM_RELIABILITY_CHECKS,
  scoreComponentDefinitions,
  SIFT_SCORE_VERSION,
} from "../../features/scoring/formula";
import type { SiftScoreInput } from "../../features/scoring/model";

const asOf = "2026-08-22T12:00:00.000Z";

function completeInput(
  overrides: Partial<SiftScoreInput> = {},
): SiftScoreInput {
  return {
    active: true,
    agentDbId: "11111111-1111-4111-8111-111111111111",
    description: "A validated test-only description.",
    health: {
      checkCount: 10,
      checkedEndpoint: "https://agent.test-only.dev/health",
      endpointHash: "a".repeat(64),
      failureCount: 0,
      lastCheckedAt: "2026-08-22T11:00:00.000Z",
      lastSuccessAt: "2026-08-22T11:00:00.000Z",
      outcome: "success",
      responseTimeMs: 80,
      serviceType: "health",
      status: "online",
      successCount: 9,
    },
    imageUrl: "https://agent.test-only.dev/avatar.png",
    metadataStatus: "valid",
    metadataVerifiedAt: "2026-08-22T10:00:00.000Z",
    name: "Test-only agent",
    ownerAddress: "0x1111111111111111111111111111111111111111",
    reputation: {
      failedJobs: 2,
      feedbackCount: 10,
      reputationScore: 80,
      source: "test-only normalized registry evidence",
      sourceObservedAt: "2026-08-22T09:00:00.000Z",
      successfulJobs: 8,
    },
    services: [
      {
        endpoint: "https://agent.test-only.dev/health",
        metadata: { declared: true },
        serviceType: "health",
        version: "1.0",
      },
      {
        endpoint: "https://agent.test-only.dev/.well-known/agent-card.json",
        metadata: null,
        serviceType: "A2A",
        version: null,
      },
      {
        endpoint: null,
        metadata: null,
        serviceType: "MCP",
        version: null,
      },
    ],
    x402Supported: true,
    ...overrides,
  };
}

describe("Sift Score formula", () => {
  it("publishes the documented full-evidence fixture deterministically", () => {
    const input = completeInput();
    const first = calculateSiftScore(input, asOf);
    const second = calculateSiftScore(input, asOf);

    assert.deepEqual(first, second);
    assert.equal(first.version, SIFT_SCORE_VERSION);
    assert.equal(first.score, 90.5);
    assert.equal(first.confidence, 1);
    assert.deepEqual(first.components, {
      availability: 100,
      capability: 100,
      metadata: 100,
      reliability: 90,
      reputation: 80,
      trackRecord: 80,
    });
    assert.deepEqual(
      (first.evidenceSnapshot as {
        earnedComponentPoints: Record<string, number | null>;
      }).earnedComponentPoints,
      {
        availability: 20,
        capability: 10,
        metadata: 10,
        reliability: 22.5,
        reputation: 12,
        trackRecord: 16,
      },
    );
  });

  it("keeps formula weights explicit and totaling 100", () => {
    assert.equal(
      scoreComponentDefinitions.reduce(
        (total, component) => total + component.weight,
        0,
      ),
      100,
    );
    assert.equal(MINIMUM_RELIABILITY_CHECKS, 3);
  });

  it("normalizes metadata completeness without inventing omitted fields", () => {
    const full = calculateSiftScore(completeInput(), asOf);
    const sparse = calculateSiftScore(
      completeInput({
        active: null,
        description: null,
        imageUrl: null,
        metadataVerifiedAt: "2026-08-22T10:00:00.000Z",
        name: null,
        ownerAddress: null,
        services: [],
        x402Supported: null,
      }),
      asOf,
    );
    const invalid = calculateSiftScore(
      completeInput({ metadataStatus: "invalid" }),
      asOf,
    );

    assert.equal(full.components.metadata, 100);
    assert.equal(sparse.components.metadata, 15);
    assert.equal(sparse.components.capability, null);
    assert.equal(invalid.components.metadata, null);
    assert.equal(invalid.components.capability, null);
  });

  it("caps published service information and does not call it performance", () => {
    const singleDeclaration = calculateSiftScore(
      completeInput({
        services: [
          {
            endpoint: null,
            metadata: null,
            serviceType: "MCP",
            version: null,
          },
        ],
      }),
      asOf,
    );
    const completeDeclarations = calculateSiftScore(completeInput(), asOf);

    assert.equal(singleDeclaration.components.capability, 40);
    assert.equal(completeDeclarations.components.capability, 100);
    assert.match(
      scoreComponentDefinitions.find(({ key }) => key === "capability")
        ?.description ?? "",
      /published|listed/i,
    );
  });

  it("maps fresh reachability states and withholds reliability before 3 checks", () => {
    const states = [
      ["online", 100],
      ["degraded", 40],
      ["offline", 0],
      ["unknown", null],
    ] as const;

    for (const [status, expected] of states) {
      const assessment = calculateSiftScore(
        completeInput({
          health: {
            ...completeInput().health!,
            checkCount: 1,
            status,
            successCount: status === "online" ? 1 : 0,
          },
        }),
        asOf,
      );
      assert.equal(assessment.components.availability, expected);
      assert.equal(assessment.components.reliability, null);
    }
  });

  it("normalizes reliability and track record with documented rounding", () => {
    const assessment = calculateSiftScore(
      completeInput({
        health: {
          ...completeInput().health!,
          checkCount: 3,
          successCount: 2,
        },
        reputation: {
          ...completeInput().reputation!,
          failedJobs: 1,
          successfulJobs: 2,
        },
      }),
      asOf,
    );

    assert.equal(assessment.components.reliability, 66.67);
    assert.equal(assessment.components.trackRecord, 66.67);
  });

  it("requires named current reputation provenance and a 0-100 value", () => {
    for (const reputation of [
      { ...completeInput().reputation!, source: null },
      { ...completeInput().reputation!, sourceObservedAt: null },
      { ...completeInput().reputation!, reputationScore: 101 },
    ]) {
      const assessment = calculateSiftScore(
        completeInput({ reputation }),
        asOf,
      );

      if (!reputation.source || !reputation.sourceObservedAt) {
        assert.equal(assessment.components.reputation, null);
        assert.equal(assessment.components.trackRecord, null);
      } else {
        assert.equal(assessment.components.reputation, null);
        assert.equal(assessment.components.trackRecord, 80);
      }
    }
  });

  it("includes exact freshness boundaries and excludes stale or future evidence", () => {
    const boundary = calculateSiftScore(
      completeInput({
        health: {
          ...completeInput().health!,
          lastCheckedAt: "2026-08-21T12:00:00.000Z",
        },
        metadataVerifiedAt: "2026-07-23T12:00:00.000Z",
        reputation: {
          ...completeInput().reputation!,
          sourceObservedAt: "2026-02-23T12:00:00.000Z",
        },
      }),
      asOf,
    );
    const stale = calculateSiftScore(
      completeInput({
        health: {
          ...completeInput().health!,
          lastCheckedAt: "2026-08-21T11:59:59.999Z",
        },
        metadataVerifiedAt: "2026-07-23T11:59:59.999Z",
        reputation: {
          ...completeInput().reputation!,
          sourceObservedAt: "2026-02-23T11:59:59.999Z",
        },
      }),
      asOf,
    );
    const future = calculateSiftScore(
      completeInput({
        health: {
          ...completeInput().health!,
          lastCheckedAt: "2026-08-22T12:00:00.001Z",
        },
      }),
      asOf,
    );

    assert.equal(boundary.confidence, 1);
    assert.deepEqual(stale.components, {
      availability: null,
      capability: null,
      metadata: null,
      reliability: null,
      reputation: null,
      trackRecord: null,
    });
    assert.equal(stale.score, 0);
    assert.equal(future.components.availability, null);
  });

  it("adds only the criteria with available evidence", () => {
    const declarationsOnly = calculateSiftScore(
      completeInput({ health: null, reputation: null }),
      asOf,
    );
    const oneHealthObservation = calculateSiftScore(
      completeInput({
        health: {
          ...completeInput().health!,
          checkCount: 1,
          successCount: 1,
        },
        reputation: null,
      }),
      asOf,
    );

    assert.equal(declarationsOnly.confidence, 0.2);
    assert.equal(declarationsOnly.score, 20);
    assert.equal(oneHealthObservation.confidence, 0.4);
    assert.equal(oneHealthObservation.score, 40);
    assert.match(oneHealthObservation.limitations.join(" "), /reliability/i);
  });

  it("adds reliability points after three current checks", () => {
    const assessment = calculateSiftScore(
      completeInput({
        health: {
          ...completeInput().health!,
          checkCount: 3,
          status: "online",
          successCount: 2,
        },
        reputation: null,
      }),
      asOf,
    );

    assert.equal(assessment.confidence, 0.65);
    assert.equal(assessment.score, 56.67);
  });

  it("gives a failed observation zero availability points", () => {
    const assessment = calculateSiftScore(
      completeInput({
        health: {
          ...completeInput().health!,
          checkCount: 1,
          status: "offline",
          successCount: 0,
        },
        reputation: null,
      }),
      asOf,
    );

    assert.equal(assessment.confidence, 0.4);
    assert.equal(assessment.score, 20);
  });

  it("gives invalid profile criteria zero points without hiding other evidence", () => {
    const assessment = calculateSiftScore(
      completeInput({ metadataStatus: "invalid" }),
      asOf,
    );

    assert.equal(assessment.confidence, 0.8);
    assert.equal(assessment.score, 70.5);
    assert.match(assessment.limitations.join(" "), /profile integrity/i);
  });

  it("rejects an invalid assessment timestamp", () => {
    assert.throws(
      () => calculateSiftScore(completeInput(), "not-a-time"),
      /valid timestamp/,
    );
  });
});
