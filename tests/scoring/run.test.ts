import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runScoreCalculation } from "../../features/scoring/run";
import type { SiftScoreInput } from "../../features/scoring/model";
import type { AgentScoreWriteInput } from "../../lib/db/validation";
import type { Logger } from "../../lib/indexer/logger";

const calculatedAt = "2026-08-22T12:00:00.000Z";
const candidate: SiftScoreInput = {
  active: true,
  agentDbId: "11111111-1111-4111-8111-111111111111",
  description: "Test-only runner fixture.",
  health: {
    checkCount: 1,
    checkedEndpoint: "https://agent.test-only.dev/health",
    endpointHash: "a".repeat(64),
    failureCount: 0,
    lastCheckedAt: calculatedAt,
    lastSuccessAt: calculatedAt,
    outcome: "success",
    responseTimeMs: 10,
    serviceType: "health",
    status: "online",
    successCount: 1,
  },
  imageUrl: null,
  metadataStatus: "valid",
  metadataVerifiedAt: calculatedAt,
  name: "Runner fixture",
  ownerAddress: "0x1111111111111111111111111111111111111111",
  reputation: null,
  services: [
    {
      endpoint: "https://agent.test-only.dev/health",
      metadata: null,
      serviceType: "health",
      version: null,
    },
  ],
  x402Supported: null,
};

const logger: Logger = {
  error: () => undefined,
  info: () => undefined,
  warn: () => undefined,
};

describe("score calculation orchestration", () => {
  it("persists a stable overwrite for identical inputs", async () => {
    const batches: (readonly AgentScoreWriteInput[])[] = [];
    const repository = {
      listCandidates: async () => [candidate],
      save: async (records: readonly AgentScoreWriteInput[]) => {
        batches.push(structuredClone(records));
      },
    };
    const dependencies = {
      logger,
      now: () => new Date(calculatedAt),
      repository,
    };

    const first = await runScoreCalculation({ batchLimit: 20 }, dependencies);
    const second = await runScoreCalculation({ batchLimit: 20 }, dependencies);

    assert.deepEqual(first, { assessed: 1, published: 1, withheld: 0 });
    assert.deepEqual(second, first);
    assert.deepEqual(batches[0], batches[1]);
  });

  it("recalculates from changed source inputs and persists withheld results", async () => {
    let current = candidate;
    const scores: (number | null)[] = [];
    const repository = {
      listCandidates: async () => [current],
      save: async (records: readonly AgentScoreWriteInput[]) => {
        scores.push(records[0].assessment.score);
      },
    };

    await runScoreCalculation(
      { batchLimit: 20 },
      { logger, now: () => new Date(calculatedAt), repository },
    );
    current = {
      ...candidate,
      health: null,
      metadataStatus: "unavailable",
      metadataVerifiedAt: null,
      services: [],
    };
    const summary = await runScoreCalculation(
      { batchLimit: 20 },
      { logger, now: () => new Date(calculatedAt), repository },
    );

    assert.deepEqual(scores, [81.25, null]);
    assert.deepEqual(summary, { assessed: 1, published: 0, withheld: 1 });
  });
});
