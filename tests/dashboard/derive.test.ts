import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  classifyDashboardJob,
  isDashboardObservationStale,
  mapProtocolJobStatus,
  orderDashboardActivity,
  shouldPollDashboard,
  summarizeDashboardJobs,
} from "../../features/dashboard/derive";
import type { DashboardJob } from "../../features/dashboard/model";

function job(overrides: Partial<DashboardJob> = {}): DashboardJob {
  return {
    activities: [],
    agent: {
      agentId: "42",
      chainId: 56,
      healthCheckedAt: null,
      healthStatus: "unknown",
      imageUrl: null,
      name: "Test-only Agent 42",
      profileHref: "/agents/56/42",
    },
    budgetDisplay: "1",
    category: "pending",
    confirmedAt: null,
    createdAt: "2026-08-24T10:00:00.000Z",
    currentStep: "create_job",
    deliverables: "Test-only deliverable",
    expiresAt: "2026-08-25T10:00:00.000Z",
    failureMessage: null,
    id: "11111111-1111-4111-8111-111111111111",
    maximumSpendDisplay: "2",
    mission: "Test-only mission that is sufficiently descriptive.",
    networkName: "BSC Mainnet",
    onchainJobId: null,
    paymentTokenSymbol: "U",
    protocolObservedAt: null,
    protocolStatus: "unknown",
    protocolVerification: "not-applicable",
    qualityStandards: "Test-only quality standards",
    statusLabel: "Awaiting wallet",
    transactionHash: null,
    transactions: [],
    ...overrides,
  };
}

describe("dashboard status and summary derivation", () => {
  it("maps the documented ERC-8183 lifecycle without inventing extra states", () => {
    assert.deepEqual(
      [0, 1, 2, 3, 4, 5, 99].map(mapProtocolJobStatus),
      ["open", "funded", "submitted", "completed", "rejected", "expired", "unknown"],
    );
  });

  it("classifies completion only from protocol evidence", () => {
    assert.equal(classifyDashboardJob({ persistedStatus: "confirmed", protocolStatus: "completed" }), "completed");
    assert.equal(classifyDashboardJob({ persistedStatus: "confirmed", protocolStatus: "funded" }), "active");
    assert.equal(classifyDashboardJob({ persistedStatus: "confirmed", protocolStatus: "unknown" }), "active");
    assert.equal(classifyDashboardJob({ persistedStatus: "submitted", protocolStatus: "unknown" }), "pending");
    assert.equal(classifyDashboardJob({ persistedStatus: "cancelled", protocolStatus: "unknown" }), "failed");
    assert.equal(classifyDashboardJob({ persistedStatus: "confirmed", protocolStatus: "expired" }), "failed");
    assert.equal(classifyDashboardJob({ persistedStatus: "failed", protocolStatus: "funded" }), "active");
  });

  it("aggregates only supplied jobs and persisted activity", () => {
    const jobs = [
      job({ category: "active", activities: [{ description: "Test", id: "1", occurredAt: "2026-08-24T10:00:00.000Z", source: "application", title: "Saved", transactionHash: null }] }),
      job({ category: "completed", activities: [{ description: "Test", id: "2", occurredAt: "2026-08-24T11:00:00.000Z", source: "onchain", title: "Confirmed", transactionHash: `0x${"1".repeat(64)}` }] }),
      job({ category: "pending" }),
      job({ category: "failed" }),
    ];
    assert.deepEqual(summarizeDashboardJobs(jobs), {
      active: 1,
      completed: 1,
      pending: 1,
      totalActivity: 2,
    });
  });

  it("orders activity deterministically newest first", () => {
    const ordered = orderDashboardActivity([
      { description: "", id: "1", occurredAt: "2026-08-24T10:00:00.000Z", source: "application", title: "First", transactionHash: null },
      { description: "", id: "3", occurredAt: "2026-08-24T11:00:00.000Z", source: "onchain", title: "Third", transactionHash: null },
      { description: "", id: "2", occurredAt: "2026-08-24T11:00:00.000Z", source: "onchain", title: "Second", transactionHash: null },
    ]);
    assert.deepEqual(ordered.map((entry) => entry.id), ["3", "2", "1"]);
  });

  it("polls non-terminal jobs and identifies stale observations", () => {
    assert.equal(shouldPollDashboard([job({ category: "active" })]), true);
    assert.equal(shouldPollDashboard([job({ category: "pending" })]), true);
    assert.equal(shouldPollDashboard([job({ category: "completed" }), job({ category: "failed" })]), false);
    assert.equal(isDashboardObservationStale("2026-08-24T10:00:00.000Z", Date.parse("2026-08-24T10:00:30.000Z")), false);
    assert.equal(isDashboardObservationStale("2026-08-24T10:00:00.000Z", Date.parse("2026-08-24T10:01:01.000Z")), true);
  });
});
