import type { AgentProfile } from "@/features/agents/model";
import {
  discoveryCategories,
  type DiscoveryAgent,
  type DiscoveryCategory,
} from "@/features/discovery/model";
import {
  describeScoreTier,
  getAgentRating,
  scoreComponentRowsFromComponents,
  type AgentRatingInput,
} from "@/features/scoring/presentation";

function categoryLabel(category: DiscoveryCategory): string {
  return (
    discoveryCategories.find((candidate) => candidate.slug === category)
      ?.label ?? category
  );
}

function identityLinks(chainId: number, agentId: string) {
  return {
    api: `/api/v1/agents/${chainId}/${agentId}`,
    profile: `/agents/${chainId}/${agentId}`,
  };
}

function scoreInput(
  agent: DiscoveryAgent | AgentProfile,
): AgentRatingInput {
  return {
    active: agent.active,
    description: agent.description,
    health: agent.health,
    imageUrl: agent.imageUrl,
    lastSyncedAt: agent.lastSyncedAt,
    metadataStatus: agent.metadataStatus,
    metadataVerifiedAt:
      "metadataVerifiedAt" in agent ? agent.metadataVerifiedAt : null,
    name: agent.name,
    ownerAddress: agent.ownerAddress,
    reputation: "reputation" in agent ? agent.reputation : null,
    score: agent.score,
    services: agent.services,
    x402Supported: agent.x402Supported,
  };
}

function publicScore(agent: DiscoveryAgent | AgentProfile) {
  const rating = getAgentRating(scoreInput(agent));

  return {
    calculatedAt: agent.score?.calculatedAt ?? null,
    dataCoverage: Math.round(rating.coverage * 10_000) / 100,
    maximum: 100,
    state: rating.kind,
    tier: describeScoreTier(rating.value).label,
    value: rating.value,
    version: agent.score?.version ?? null,
  };
}

function publicCategories(categories: readonly DiscoveryCategory[]) {
  return categories.map((category) => ({
    id: category,
    label: categoryLabel(category),
  }));
}

function publicHealth(agent: DiscoveryAgent | AgentProfile) {
  return agent.health
    ? {
        checkCount: agent.health.checkCount,
        checkedAt: agent.health.lastCheckedAt,
        lastSuccessfulAt: agent.health.lastSuccessAt,
        responseTimeMs: agent.health.responseTimeMs,
        status: agent.health.status,
        successCount: agent.health.successCount,
      }
    : null;
}

export function toPublicAgentSummary(agent: DiscoveryAgent) {
  return {
    active: agent.active,
    agentId: agent.agentId,
    categories: publicCategories(agent.categories),
    chainId: agent.chainId,
    description: agent.description,
    health: publicHealth(agent),
    imageUrl: agent.imageUrl,
    links: identityLinks(agent.chainId, agent.agentId),
    name: agent.name,
    profileStatus: agent.metadataStatus,
    registeredAt: agent.registeredAt,
    registeredBlock: agent.registeredBlock,
    services: {
      count: agent.services.length,
      types: [...new Set(agent.services.map((service) => service.serviceType))],
    },
    siftScore: publicScore(agent),
  };
}

export function toPublicAgentProfile(profile: AgentProfile) {
  return {
    active: profile.active,
    agentId: profile.agentId,
    categories: publicCategories(profile.categories),
    chainId: profile.chainId,
    description: profile.description,
    health: publicHealth(profile),
    imageUrl: profile.imageUrl,
    links: {
      ...identityLinks(profile.chainId, profile.agentId),
      score: `/api/v1/agents/${profile.chainId}/${profile.agentId}/score`,
      tasks: `/api/v1/agents/${profile.chainId}/${profile.agentId}/tasks`,
    },
    name: profile.name,
    profileStatus: profile.metadataStatus,
    registry: {
      agentUri: profile.agentUri,
      address: profile.registryAddress,
      ownerAddress: profile.ownerAddress,
      registeredAt: profile.registeredAt,
      registeredBlock: profile.registeredBlock,
      registrationTransactionHash: profile.registrationTransactionHash,
    },
    reputation: profile.reputation
      ? {
          failedTasks: profile.reputation.failedJobs,
          feedbackCount: profile.reputation.feedbackCount,
          lastActivityAt: profile.reputation.lastActivityAt,
          score: profile.reputation.reputationScore,
          source: profile.reputation.source,
          sourceObservedAt: profile.reputation.sourceObservedAt,
          successfulTasks: profile.reputation.successfulJobs,
        }
      : null,
    services: profile.services.map((service) => ({
      accessMethod: service.activationMethod ?? null,
      availability: service.availabilityStatus ?? "unchecked",
      availabilityCheckedAt: service.availabilityCheckedAt ?? null,
      endpoint: service.endpoint,
      type: service.serviceType,
      version: service.version,
    })),
    siftScore: publicScore(profile),
  };
}

export function toPublicAgentScore(profile: AgentProfile) {
  const rating = getAgentRating(scoreInput(profile));
  const summary = publicScore(profile);

  return {
    ...summary,
    criteria: scoreComponentRowsFromComponents(rating.components).map(
      (criterion) => ({
        description: criterion.description,
        id: criterion.key,
        maximumPoints: criterion.weight,
        points: criterion.contribution ?? 0,
      }),
    ),
    freshness: profile.score?.sourceFreshness ?? {
      healthAt: profile.health?.lastCheckedAt ?? null,
      metadataAt: profile.metadataVerifiedAt,
      reputationAt: profile.reputation?.sourceObservedAt ?? null,
    },
    method: "sum-earned-component-points",
  };
}

export function toPublicAgentTasks(profile: AgentProfile) {
  return {
    agentId: profile.agentId,
    chainId: profile.chainId,
    records: profile.taskHistory.map((task) => ({
      blockNumber: task.blockNumber,
      confirmedAt: task.confirmedAt,
      onchainJobId: task.onchainJobId,
      transactionHash: task.transactionHash,
    })),
    reportedTotals: profile.reputation
      ? {
          failed: profile.reputation.failedJobs,
          feedbackCount: profile.reputation.feedbackCount,
          lastActivityAt: profile.reputation.lastActivityAt,
          source: profile.reputation.source,
          sourceObservedAt: profile.reputation.sourceObservedAt,
          successful: profile.reputation.successfulJobs,
        }
      : null,
    scope:
      "records contains the latest 10 confirmed ERC-8183 hires made through Sift; reportedTotals may cover additional work reported by its named source.",
  };
}
