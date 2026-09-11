import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAddress } from "viem";

import {
  createDashboardRepository,
  type DashboardSources,
} from "../../lib/db/dashboard-repository";
import type { TableRow } from "../../lib/db/database.types";

const wallet = getAddress("0x1111111111111111111111111111111111111111");
const jobId = "11111111-1111-4111-8111-111111111111";
const agentDbId = "22222222-2222-4222-8222-222222222222";

const job: TableRow<"jobs"> = {
  agent_db_id: agentDbId,
  agent_id: "42",
  block_number: null,
  budget_base_units: "1000000000000000000",
  chain_id: 56,
  commerce_address: "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de",
  confirmed_at: null,
  created_at: "2026-08-24T10:00:00.000Z",
  current_step: "create_job",
  deliverables: "Test-only deliverable",
  expires_at: "2026-08-25T10:00:00.000Z",
  failure_code: null,
  failure_message: null,
  id: jobId,
  idempotency_key: "33333333-3333-4333-8333-333333333333",
  maximum_spend_base_units: "2000000000000000000",
  mission: "Test-only dashboard mission with sufficient detail.",
  negotiation_hash: `0x${"1".repeat(64)}`,
  onchain_description: "test-only description",
  onchain_job_id: null,
  payment_token_address: "0xc70b8741b8b07a6d61e54fd4b20f22fa648e5565",
  payment_token_decimals: 18,
  payment_token_symbol: "U",
  policy_address: "0xd6a4217588f6b1f5657a92a3e94e6422ad771cea",
  provider_address: "0x4444444444444444444444444444444444444444",
  quality_standards: "Test-only quality standard",
  quote_expires_at: "2026-08-24T10:05:00.000Z",
  registry_address: "0x8004a818bfb912233c491871b3d84c89a494bd9e",
  resume_token_hash: "a".repeat(64),
  router_address: "0xd7d36d66d2f1b608a0f943f722d27e3744f66f25",
  status: "awaiting_wallet",
  transaction_hash: null,
  updated_at: "2026-08-24T10:00:00.000Z",
  wallet_address: wallet.toLowerCase(),
};

const agent: TableRow<"agents"> = {
  active: true,
  agent_id: "42",
  agent_uri: "ipfs://test-only-agent",
  category: null,
  chain_id: 56,
  created_at: "2026-08-22T10:00:00.000Z",
  description: "Test-only agent",
  id: agentDbId,
  image_url: null,
  last_synced_at: "2026-08-24T09:00:00.000Z",
  metadata_status: "valid",
  metadata_verified_at: "2026-08-24T09:00:00.000Z",
  name: "Test Agent",
  owner_address: "0x4444444444444444444444444444444444444444",
  registered_at: "2026-08-22T10:00:00.000Z",
  registered_block: 100,
  registration_log_index: 0,
  registration_transaction_hash: `0x${"1".repeat(64)}`,
  registry_address: "0x8004a818bfb912233c491871b3d84c89a494bd9e",
  updated_at: "2026-08-24T09:00:00.000Z",
  x402_supported: null,
};

const health: TableRow<"agent_health"> = {
  agent_db_id: agentDbId,
  check_count: 1,
  checked_endpoint: "https://test-only.example/health",
  created_at: "2026-08-24T09:00:00.000Z",
  endpoint_hash: "b".repeat(64),
  failure_count: 0,
  last_checked_at: "2026-08-24T09:00:00.000Z",
  last_success_at: "2026-08-24T09:00:00.000Z",
  outcome: "success",
  response_time_ms: 50,
  service_type: "health",
  status: "online",
  success_count: 1,
  updated_at: "2026-08-24T09:00:00.000Z",
};

describe("dashboard repository wallet boundary", () => {
  it("passes the verified wallet to the job source and bulk-loads only related evidence", async () => {
    const calls: string[] = [];
    const sources: DashboardSources = {
      async listActivities(ids) {
        calls.push("activity");
        assert.deepEqual(ids, [jobId]);
        return [{ activity_type: "intent_created", created_at: job.created_at, details: {}, id: 1, job_db_id: jobId, occurred_at: job.created_at, transaction_hash: null }];
      },
      async listAgents(ids) {
        calls.push("agents");
        assert.deepEqual(ids, [agentDbId]);
        return [agent];
      },
      async listHealth(ids) {
        calls.push("health");
        assert.deepEqual(ids, [agentDbId]);
        return [health];
      },
      async listJobs(requestedWallet, chainId) {
        calls.push("jobs");
        assert.equal(requestedWallet, wallet);
        assert.equal(chainId, 56);
        return [job];
      },
      async listTransactions(ids) {
        calls.push("transactions");
        assert.deepEqual(ids, [jobId]);
        return [];
      },
    };

    const records = await createDashboardRepository(sources).listWalletJobs(wallet, 56);
    assert.equal(records.length, 1);
    assert.equal(records[0]?.job.wallet_address, wallet.toLowerCase());
    assert.equal(records[0]?.agent?.name, "Test Agent");
    assert.equal(records[0]?.health?.status, "online");
    assert.equal(records[0]?.activities.length, 1);
    assert.deepEqual([...calls].sort(), ["activity", "agents", "health", "jobs", "transactions"]);
  });

  it("does not query evidence tables when the scoped wallet has no jobs", async () => {
    let evidenceCalls = 0;
    const sources: DashboardSources = {
      listActivities: async () => { evidenceCalls += 1; return []; },
      listAgents: async () => { evidenceCalls += 1; return []; },
      listHealth: async () => { evidenceCalls += 1; return []; },
      listJobs: async (requestedWallet, chainId) => {
        assert.equal(requestedWallet, wallet);
        assert.equal(chainId, 56);
        return [];
      },
      listTransactions: async () => { evidenceCalls += 1; return []; },
    };
    assert.deepEqual(
      await createDashboardRepository(sources).listWalletJobs(wallet, 56),
      [],
    );
    assert.equal(evidenceCalls, 0);
  });
});
