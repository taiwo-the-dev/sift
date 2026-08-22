import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseHealthCheckConfig } from "../../features/health/config";
import { parseScoreRunConfig } from "../../features/scoring/config";

describe("M6 assessment configuration", () => {
  it("uses bounded free-tier defaults", () => {
    assert.deepEqual(parseHealthCheckConfig({}), {
      concurrency: 3,
      intervalHours: 6,
      limit: 20,
      maxBytes: 65_536,
      retries: 1,
      timeoutMs: 5_000,
    });
    assert.deepEqual(parseScoreRunConfig({}), { batchLimit: 200 });
  });

  it("accepts bounded overrides and rejects aggressive values", () => {
    assert.equal(
      parseHealthCheckConfig({ HEALTH_CHECK_LIMIT: "5" }).limit,
      5,
    );
    assert.throws(() =>
      parseHealthCheckConfig({ HEALTH_CHECK_CONCURRENCY: "20" }),
    );
    assert.throws(() => parseScoreRunConfig({ SCORE_BATCH_LIMIT: "501" }));
  });
});
