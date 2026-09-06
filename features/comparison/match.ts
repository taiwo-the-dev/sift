import type { AgentProfile } from "@/features/agents/model";
import { collectDeclaredCapabilities } from "@/features/agents/presentation";
import type {
  AgentReference,
  ContextualMatch,
} from "@/features/comparison/model";
import {
  extractDiscoverySearchTerms,
  inferDiscoveryCategory,
} from "@/features/discovery/query";
import { isScoreStale } from "@/features/scoring/presentation";

type CandidateEvidence = Readonly<{
  agent: AgentReference;
  categoryMatched: boolean;
  contextualPoints: number;
  matchedTerms: readonly string[];
  profile: AgentProfile;
}>;

function searchableEvidence(profile: AgentProfile): string {
  return [
    profile.name,
    profile.description,
    ...profile.categories,
    ...profile.services.flatMap((service) => [
      service.serviceType,
      service.version,
    ]),
    ...collectDeclaredCapabilities(profile.services),
  ]
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .normalize("NFKC")
    .toLowerCase();
}

function containsTerm(document: string, term: string): boolean {
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escapedTerm}([^a-z0-9]|$)`, "i").test(
    document,
  );
}

function candidateEvidence(
  profile: AgentProfile,
  goal: string,
): CandidateEvidence {
  const inferredCategory = inferDiscoveryCategory(goal);
  const categoryMatched = Boolean(
    inferredCategory && profile.categories.includes(inferredCategory),
  );
  const document = searchableEvidence(profile);
  const matchedTerms = extractDiscoverySearchTerms(goal).filter((term) =>
    containsTerm(document, term),
  );

  return {
    agent: { agentId: profile.agentId, chainId: profile.chainId },
    categoryMatched,
    contextualPoints: (categoryMatched ? 4 : 0) + matchedTerms.length,
    matchedTerms,
    profile,
  };
}

function canUseScoreAsTieBreaker(candidate: CandidateEvidence): boolean {
  const score = candidate.profile.score;

  return Boolean(
    score &&
      score.score !== null &&
      score.confidence >= 0.5 &&
      !isScoreStale(score.calculatedAt),
  );
}

function describeMatch(candidate: CandidateEvidence, usedScore: boolean): string {
  const signals = [
    candidate.categoryMatched ? "a supported goal category" : null,
    candidate.matchedTerms.length > 0
      ? `${candidate.matchedTerms.length} goal ${
          candidate.matchedTerms.length === 1 ? "term" : "terms"
        } in the agent's profile`
      : null,
  ].filter((value): value is string => Boolean(value));
  const scoreSuffix = usedScore
    ? " The Sift Score was used to choose between equally matched agents."
    : "";

  return `The selected agent matches ${signals.join(
    " and ",
  )}.${scoreSuffix}`;
}

export function findContextualMatch(
  profiles: readonly AgentProfile[],
  goal: string,
): ContextualMatch | null {
  const normalizedGoal = goal.normalize("NFKC").replace(/\s+/g, " ").trim();

  if (!normalizedGoal || profiles.length < 2) {
    return null;
  }

  const candidates = profiles.map((profile) =>
    candidateEvidence(profile, normalizedGoal),
  );
  const highestPoints = Math.max(
    ...candidates.map((candidate) => candidate.contextualPoints),
  );

  if (highestPoints < 2) {
    return null;
  }

  const leaders = candidates.filter(
    (candidate) => candidate.contextualPoints === highestPoints,
  );
  let winner = leaders.length === 1 ? leaders[0] : undefined;
  let usedScore = false;

  if (!winner && leaders.every(canUseScoreAsTieBreaker)) {
    const ordered = [...leaders].sort(
      (left, right) =>
        (right.profile.score?.score ?? 0) - (left.profile.score?.score ?? 0),
    );
    const first = ordered[0];
    const second = ordered[1];

    if (
      first &&
      second &&
      first.profile.score?.score !== second.profile.score?.score
    ) {
      winner = first;
      usedScore = true;
    }
  }

  return winner
    ? {
        agent: winner.agent,
        categoryMatched: winner.categoryMatched,
        matchedTerms: winner.matchedTerms,
        reason: describeMatch(winner, usedScore),
      }
    : null;
}
