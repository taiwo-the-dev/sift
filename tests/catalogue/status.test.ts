import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveCatalogueSyncState } from "../../features/catalogue/status";

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
});
