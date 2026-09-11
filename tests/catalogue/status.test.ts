import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveCatalogueSyncState } from "../../features/catalogue/status";
import { createCatalogueStatusRepository } from "../../lib/db/catalogue-status-repository";

const now = new Date("2026-08-25T12:00:00.000Z");

describe("catalogue network status", () => {
  it("distinguishes unavailable, partial, current, and stale observations", () => {
    assert.deepEqual(deriveCatalogueSyncState(null, now), {
      isStale: false,
      phase: "unavailable",
    });
    assert.deepEqual(
      deriveCatalogueSyncState(
        {
          confirmedHead: 200,
          lastSyncedBlock: 150,
          updatedAt: "2026-08-25T11:00:00.000Z",
        },
        now,
      ),
      { isStale: false, phase: "partial" },
    );
    assert.deepEqual(
      deriveCatalogueSyncState(
        {
          confirmedHead: 200,
          lastSyncedBlock: 200,
          updatedAt: "2026-08-25T11:00:00.000Z",
        },
        now,
      ),
      { isStale: false, phase: "current" },
    );
    assert.deepEqual(
      deriveCatalogueSyncState(
        {
          confirmedHead: 200,
          lastSyncedBlock: 200,
          updatedAt: "2026-08-25T01:00:00.000Z",
        },
        now,
      ),
      { isStale: true, phase: "current" },
    );
  });

  it("keeps planned inventory counts explicitly labelled as estimates", async () => {
    const statuses = await createCatalogueStatusRepository({
      async observe() {
        return {
          agentCount: 331_000,
          agentCountIsEstimate: true,
          checkpoint: null,
          latestAgentSyncAt: null,
        };
      },
    }).list(now);

    assert.equal(statuses.length, 2);
    assert.equal(statuses[0]?.chainId, 56);
    assert.equal(statuses[1]?.chainId, 97);
    assert.ok(statuses.every((status) => status.agentCountIsEstimate));
  });
});
