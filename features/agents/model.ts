import type {
  CategorySource,
  DiscoveryCategory,
} from "@/features/discovery/model";
import type { Json } from "@/lib/db/database.types";
import type { MetadataStatus } from "@/lib/db/validation";
import type { HealthOutcome } from "@/features/health/model";
import type { PersistedSiftScore } from "@/features/scoring/model";

export type AgentProfileService = Readonly<{
  endpoint: string | null;
  metadata: Json | null;
  serviceType: string;
  version: string | null;
}>;

export type AgentHealthEvidence = Readonly<{
  checkCount: number;
  checkedEndpoint: string | null;
  failureCount: number;
  lastCheckedAt: string;
  lastSuccessAt: string | null;
  outcome: HealthOutcome | null;
  responseTimeMs: number | null;
  serviceType: string | null;
  status: "online" | "degraded" | "offline" | "unknown";
  successCount: number;
}>;

export type AgentReputationEvidence = Readonly<{
  failedJobs: number | null;
  feedbackCount: number | null;
  lastActivityAt: string | null;
  reputationScore: number | null;
  source: string | null;
  sourceObservedAt: string | null;
  successfulJobs: number | null;
  updatedAt: string;
}>;

export type AgentProfile = Readonly<{
  active: boolean | null;
  agentId: string;
  agentUri: string | null;
  categories: readonly DiscoveryCategory[];
  categorySource: CategorySource;
  chainId: number;
  description: string | null;
  health: AgentHealthEvidence | null;
  imageUrl: string | null;
  lastSyncedAt: string | null;
  metadataStatus: MetadataStatus;
  metadataVerifiedAt: string | null;
  name: string | null;
  ownerAddress: string | null;
  registeredAt: string | null;
  registeredBlock: number | null;
  registryAddress: string;
  reputation: AgentReputationEvidence | null;
  score: PersistedSiftScore | null;
  services: readonly AgentProfileService[];
  x402Supported: boolean | null;
}>;
