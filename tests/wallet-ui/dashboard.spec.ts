import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Network, WalletCards } from "lucide-react";

import { DashboardStateCard } from "../../components/dashboard/dashboard-page-client";
import { DashboardView } from "../../components/dashboard/dashboard-view";
import type { DashboardJob, DashboardSnapshot } from "../../features/dashboard/model";

function dashboard(jobs: readonly DashboardJob[]): DashboardSnapshot {
  return {
    jobs,
    observedAt: "2026-08-24T12:00:00.000Z",
    partial: false,
    summary: {
      active: jobs.filter((job) => job.category === "active").length,
      completed: jobs.filter((job) => job.category === "completed").length,
      pending: jobs.filter((job) => job.category === "pending").length,
      totalActivity: jobs.reduce((total, job) => total + job.activities.length, 0),
    },
    walletAddress: "0x1111111111111111111111111111111111111111",
  };
}

function failedJob(): DashboardJob {
  return {
    activities: [{
      description: "The test-only transaction was observed as failed.",
      id: "1",
      occurredAt: "2026-08-24T11:00:00.000Z",
      source: "onchain",
      title: "Transaction failed",
      transactionHash: `0x${"1".repeat(64)}`,
    }],
    agent: {
      agentId: "42",
      chainId: 56,
      healthCheckedAt: null,
      healthStatus: "unknown",
      imageUrl: null,
      name: "Test-only Agent",
      profileHref: "/agents/56/42",
    },
    budgetDisplay: "1",
    category: "failed",
    confirmedAt: null,
    createdAt: "2026-08-24T10:00:00.000Z",
    currentStep: "fund_job",
    deliverables: "Test-only deliverable",
    expiresAt: "2026-08-25T10:00:00.000Z",
    failureMessage: "Test-only transaction reverted.",
    id: "11111111-1111-4111-8111-111111111111",
    maximumSpendDisplay: "2",
    mission: "Test-only mission with enough detail for the dashboard.",
    networkName: "BSC Mainnet",
    onchainJobId: "7",
    paymentTokenSymbol: "U",
    protocolObservedAt: "2026-08-24T12:00:00.000Z",
    protocolStatus: "rejected",
    protocolVerification: "verified",
    qualityStandards: "Test-only quality standards",
    statusLabel: "Rejected on-chain",
    transactionHash: `0x${"1".repeat(64)}`,
    transactions: [],
  };
}

describe("dashboard browser-facing states", () => {
  it("renders clear disconnected and wrong-network guidance", () => {
    const disconnected = renderToStaticMarkup(
      createElement(
        DashboardStateCard,
        {
          description: "Connect the wallet used to create jobs.",
          icon: WalletCards,
          title: "Connect your hiring wallet",
        },
        createElement("button", null, "Connect wallet"),
      ),
    );
    const wrongNetwork = renderToStaticMarkup(
      createElement(
        DashboardStateCard,
        {
          description: "The dashboard will not mix jobs from another network.",
          icon: Network,
          title: "Switch to BSC Mainnet",
        },
        createElement("button", null, "Switch network"),
      ),
    );
    assert.match(disconnected, /Connect your hiring wallet/);
    assert.match(wrongNetwork, /Switch to BSC Mainnet/);
  });

  it("renders an honest empty state without sample jobs", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardView, {
        dashboard: dashboard([]),
        onRefresh() {},
        refreshing: false,
      }),
    );
    assert.match(html, /No agent tasks for this wallet yet/);
    assert.match(html, /Hire a compatible agent to create your first ERC-8183 task/);
  });

  it("renders failed status, provenance, details, and mobile-safe filtering without unsupported actions", () => {
    const html = renderToStaticMarkup(
      createElement(DashboardView, {
        dashboard: dashboard([failedJob()]),
        onRefresh() {},
        refreshing: false,
      }),
    );
    assert.match(html, /Rejected on-chain/);
    assert.match(html, /Blockchain record/);
    assert.match(html, /Test-only mission/);
    assert.match(html, /overflow-x-auto/);
    assert.doesNotMatch(html, />Pause</);
    assert.doesNotMatch(html, />Revoke</);
  });
});
