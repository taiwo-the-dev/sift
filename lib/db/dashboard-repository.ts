import "server-only";

import type { Address } from "viem";

import type { HiringChainId } from "@/features/hiring/protocol";
import { getSupabaseServerClient } from "@/lib/db/client";
import type { TableRow } from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";

type AgentRecord = TableRow<"agents">;
type ActivityRecord = TableRow<"job_activity">;
type HealthRecord = TableRow<"agent_health">;
type JobRecord = TableRow<"jobs">;
type TransactionRecord = TableRow<"job_transactions">;

export type DashboardDatabaseJob = Readonly<{
  activities: readonly ActivityRecord[];
  agent: AgentRecord | null;
  health: HealthRecord | null;
  job: JobRecord;
  transactions: readonly TransactionRecord[];
}>;

export type DashboardSources = Readonly<{
  listActivities(jobIds: readonly string[]): Promise<readonly ActivityRecord[]>;
  listAgents(agentIds: readonly string[]): Promise<readonly AgentRecord[]>;
  listHealth(agentIds: readonly string[]): Promise<readonly HealthRecord[]>;
  listJobs(
    walletAddress: Address,
    chainId: HiringChainId,
  ): Promise<readonly JobRecord[]>;
  listTransactions(jobIds: readonly string[]): Promise<readonly TransactionRecord[]>;
}>;

function createSupabaseSources(): DashboardSources {
  const client = getSupabaseServerClient();

  return {
    async listActivities(jobIds) {
      const { data, error } = await client
        .from("job_activity")
        .select("*")
        .in("job_db_id", [...jobIds])
        .order("occurred_at", { ascending: false })
        .order("id", { ascending: false });
      if (error) throw new DatabaseOperationError("list dashboard activity", error);
      return data;
    },
    async listAgents(agentIds) {
      const { data, error } = await client
        .from("agents")
        .select("*")
        .in("id", [...agentIds]);
      if (error) throw new DatabaseOperationError("list dashboard agents", error);
      return data;
    },
    async listHealth(agentIds) {
      const { data, error } = await client
        .from("agent_health")
        .select("*")
        .in("agent_db_id", [...agentIds]);
      if (error) throw new DatabaseOperationError("list dashboard health", error);
      return data;
    },
    async listJobs(walletAddress, chainId) {
      const { data, error } = await client
        .from("jobs")
        .select("*")
        .eq("chain_id", chainId)
        .eq("wallet_address", walletAddress.toLowerCase())
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new DatabaseOperationError("list wallet dashboard jobs", error);
      return data;
    },
    async listTransactions(jobIds) {
      const { data, error } = await client
        .from("job_transactions")
        .select("*")
        .in("job_db_id", [...jobIds])
        .order("submitted_at", { ascending: true });
      if (error) throw new DatabaseOperationError("list dashboard transactions", error);
      return data;
    },
  };
}

function groupBy<RecordType, Key extends string>(
  records: readonly RecordType[],
  key: (record: RecordType) => Key,
): ReadonlyMap<Key, readonly RecordType[]> {
  const grouped = new Map<Key, RecordType[]>();
  for (const record of records) {
    const value = key(record);
    const entries = grouped.get(value) ?? [];
    entries.push(record);
    grouped.set(value, entries);
  }
  return grouped;
}

export function createDashboardRepository(
  sources: DashboardSources = createSupabaseSources(),
): Readonly<{
  listWalletJobs(
    walletAddress: Address,
    chainId: HiringChainId,
  ): Promise<readonly DashboardDatabaseJob[]>;
}> {
  return {
    async listWalletJobs(walletAddress, chainId) {
      const jobs = await sources.listJobs(walletAddress, chainId);
      if (jobs.length === 0) return [];

      const jobIds = jobs.map((job) => job.id);
      const agentIds = [...new Set(jobs.map((job) => job.agent_db_id))];
      const [agents, health, transactions, activities] = await Promise.all([
        sources.listAgents(agentIds),
        sources.listHealth(agentIds),
        sources.listTransactions(jobIds),
        sources.listActivities(jobIds),
      ]);
      const agentById = new Map(agents.map((agent) => [agent.id, agent]));
      const healthByAgentId = new Map(
        health.map((record) => [record.agent_db_id, record]),
      );
      const transactionsByJobId = groupBy(
        transactions,
        (record) => record.job_db_id,
      );
      const activitiesByJobId = groupBy(
        activities,
        (record) => record.job_db_id,
      );

      return jobs.map((job) => ({
        activities: activitiesByJobId.get(job.id) ?? [],
        agent: agentById.get(job.agent_db_id) ?? null,
        health: healthByAgentId.get(job.agent_db_id) ?? null,
        job,
        transactions: transactionsByJobId.get(job.id) ?? [],
      }));
    },
  };
}
