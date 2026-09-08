import type {
  CategorySource,
  DiscoveryCategory,
} from "@/features/discovery/model";
import type { Json } from "@/lib/db/database.types";
import type { MetadataStatus } from "@/lib/db/validation";
import type { HealthOutcome } from "@/features/health/model";
import type { PersistedSiftScore } from "@/features/scoring/model";
import type { CategoryEvidence } from "@/features/categories/taxonomy";
import type { ScanCrossCheck } from "@/lib/integrations/8004scan";
import type {
  ActivationAvailabilityStatus,
  ActivationMethod,
} from "@/features/activation/model";

export type AgentProfileService = Readonly<{
  activationMethod?: ActivationMethod | null;
  availabilityCheckedAt?: string | null;
  availabilityFailureCode?: string | null;
  availabilityLastSuccessAt?: string | null;
  availabilityResponseTimeMs?: number | null;
  availabilityStatus?: ActivationAvailabilityStatus;
  capabilitySummary?: Json | null;
  endpoint: string | null;
  id?: string;
  metadata: Json | null;
  serviceType: string;
  validationVersion?: string | null;
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
  categoryEvidence: readonly CategoryEvidence[];
  categorySource: CategorySource;
  chainId: number;
  description: string | null;
  externalEvidence: ScanCrossCheck | null;
  health: AgentHealthEvidence | null;
  imageUrl: string | null;
  lastSyncedAt: string | null;
  metadataStatus: MetadataStatus;
  metadataVerifiedAt: string | null;
  name: string | null;
  ownerAddress: string | null;
  registeredAt: string | null;
  registeredBlock: number | null;
  registrationLogIndex: number | null;
  registrationTransactionHash: string | null;
  registryAddress: string;
  reputation: AgentReputationEvidence | null;
  score: PersistedSiftScore | null;
  services: readonly AgentProfileService[];
  x402Supported: boolean | null;
}>;
