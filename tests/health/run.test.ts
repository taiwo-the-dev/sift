import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { HealthObservation } from "../../features/health/model";
import { runHealthChecks } from "../../features/health/run";
import type { HealthRepository } from "../../lib/db/health-repository";
import type { AgentHealthWriteInput } from "../../lib/db/validation";
import type { Logger } from "../../lib/indexer/logger";

const now = "2026-08-22T12:00:00.000Z";
const logger: Logger = {
  error: () => undefined,
  info: () => undefined,
  warn: () => undefined,
};

const candidates = [
  {
    agentDbId: "11111111-1111-4111-8111-111111111111",
    agentId: "1",
    chainId: 97,
    previousHealth: null,
    services: [
      {
        endpoint: "https://one.test-only.dev/health",
        serviceType: "health",
      },
    ],
  },
  {
    agentDbId: "22222222-2222-4222-8222-222222222222",
    agentId: "2",
    chainId: 97,
    previousHealth: null,
    services: [{ endpoint: "https://two.test-only.dev/mcp", serviceType: "MCP" }],
  },
] as const;

describe("health-check orchestration", () => {
  it("persists observations while counting only actual network probes", async () => {
    let staleBefore = "";
    let saved: readonly AgentHealthWriteInput[] = [];
    let probes = 0;
    const repository: HealthRepository = {
      listCandidates: async (_limit, threshold) => {
        staleBefore = threshold;
        return candidates;
      },
      save: async (records) => {
        saved = records;
      },
    };
    const probe = async (): Promise<HealthObservation> => {
      probes += 1;
      return {
        checkedEndpoint: "https://one.test-only.dev/health",
        endpointHash: "a".repeat(64),
        outcome: "success",
        responseTimeMs: 30,
        serviceType: "health",
        status: "online",
        wasProbed: true,
      };
    };

    const summary = await runHealthChecks(
      {
        concurrency: 2,
        intervalHours: 6,
        limit: 20,
        maxBytes: 65_536,
        retries: 1,
        timeoutMs: 5_000,
      },
      {
        logger,
        now: () => new Date(now),
        probe,
        repository,
      },
    );

    assert.equal(staleBefore, "2026-08-22T06:00:00.000Z");
    assert.equal(probes, 1);
    assert.equal(saved.length, 2);
    assert.equal(saved[1].outcome, "unsupported-service");
    assert.deepEqual(summary, {
      checked: 1,
      degraded: 0,
      offline: 0,
      online: 1,
      unknown: 1,
    });
  });

  it("respects the configured concurrency bound", async () => {
    let active = 0;
    let maximumActive = 0;
    const manyCandidates = Array.from({ length: 5 }, (_, index) => ({
      ...candidates[0],
      agentDbId: `${index + 1}1111111-1111-4111-8111-111111111111`,
      agentId: String(index + 1),
    }));
    const repository: HealthRepository = {
      listCandidates: async () => manyCandidates,
      save: async () => undefined,
    };
    const probe = async (): Promise<HealthObservation> => {
      active += 1;
      maximumActive = Math.max(maximumActive, active);
      await new Promise((resolve) => setImmediate(resolve));
      active -= 1;
      return {
        checkedEndpoint: "https://one.test-only.dev/health",
        endpointHash: "a".repeat(64),
        outcome: "success",
        responseTimeMs: 1,
        serviceType: "health",
        status: "online",
        wasProbed: true,
      };
    };

    await runHealthChecks(
      {
        concurrency: 2,
        intervalHours: 6,
        limit: 20,
        maxBytes: 65_536,
        retries: 0,
        timeoutMs: 5_000,
      },
      { logger, now: () => new Date(now), probe, repository },
    );

    assert.equal(maximumActive, 2);
  });
});
