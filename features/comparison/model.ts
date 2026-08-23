import type { AgentProfile } from "@/features/agents/model";

export const minimumComparisonAgents = 2;
export const maximumComparisonAgents = 4;

export type AgentReference = Readonly<{
  agentId: string;
  chainId: number;
}>;

export type ComparisonMissingAgent = Readonly<{
  reason: "ambiguous" | "not-found";
  reference: AgentReference;
}>;

export type ComparisonResult = Readonly<{
  agents: readonly AgentProfile[];
  missingAgents: readonly ComparisonMissingAgent[];
}>;

export type ContextualMatch = Readonly<{
  agent: AgentReference;
  categoryMatched: boolean;
  matchedTerms: readonly string[];
  reason: string;
}>;

export type ComparisonSelection = Readonly<{
  duplicateCount: number;
  goal: string;
  invalidCount: number;
  overflowCount: number;
  references: readonly AgentReference[];
}>;
