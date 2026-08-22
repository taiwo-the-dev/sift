import type { HealthSnapshot } from "@/features/health/model";
import type { Json } from "@/lib/db/database.types";
import type { MetadataStatus } from "@/lib/db/validation";

export const scoreComponentKeys = [
  "reputation",
  "reliability",
  "availability",
  "capability",
  "trackRecord",
  "metadata",
] as const;

export type ScoreComponentKey = (typeof scoreComponentKeys)[number];

export type ScoreComponents = Readonly<
  Record<ScoreComponentKey, number | null>
>;

export type ScoreSourceFreshness = Readonly<{
  healthAt: string | null;
  metadataAt: string | null;
  reputationAt: string | null;
}>;

export type SiftScoreAssessment = Readonly<{
  components: ScoreComponents;
  confidence: number;
  evidenceSnapshot: Json;
  limitations: readonly string[];
  score: number | null;
  sourceFreshness: ScoreSourceFreshness;
  version: string;
}>;

export type ScoringService = Readonly<{
  endpoint: string | null;
  metadata: Json | null;
  serviceType: string;
  version: string | null;
}>;

export type ScoringReputation = Readonly<{
  failedJobs: number | null;
  feedbackCount: number | null;
  reputationScore: number | null;
  source: string | null;
  sourceObservedAt: string | null;
  successfulJobs: number | null;
}>;

export type SiftScoreInput = Readonly<{
  active: boolean | null;
  agentDbId: string;
  description: string | null;
  health: HealthSnapshot | null;
  imageUrl: string | null;
  metadataStatus: MetadataStatus;
  metadataVerifiedAt: string | null;
  name: string | null;
  ownerAddress: string | null;
  reputation: ScoringReputation | null;
  services: readonly ScoringService[];
  x402Supported: boolean | null;
}>;

export type PersistedSiftScore = Readonly<{
  calculatedAt: string;
  components: ScoreComponents;
  confidence: number;
  score: number | null;
  sourceFreshness: ScoreSourceFreshness;
  version: string;
}>;

export type FeaturedScoredAgent = Readonly<{
  agentId: string;
  chainId: number;
  description: string | null;
  health: HealthSnapshot;
  imageUrl: string | null;
  name: string | null;
  score: PersistedSiftScore & Readonly<{ score: number }>;
}>;
