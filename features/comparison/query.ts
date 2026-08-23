import { parseAgentProfileIdentity } from "@/features/agents/route";
import {
  maximumComparisonAgents,
  type AgentReference,
  type ComparisonSelection,
} from "@/features/comparison/model";

export type ComparisonSearchParams = Readonly<
  Record<string, string | string[] | undefined>
>;

const maximumGoalLength = 180;
const agentReferencePattern = /^([^:]+):([^:]+)$/;

function values(value: string | string[] | undefined): readonly string[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeComparisonGoal(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumGoalLength);
}

export function serializeAgentReference(reference: AgentReference): string {
  return `${reference.chainId}:${reference.agentId}`;
}

export function parseAgentReference(value: string): AgentReference | null {
  const match = agentReferencePattern.exec(value);

  if (!match) {
    return null;
  }

  return parseAgentProfileIdentity(match[1] ?? "", match[2] ?? "");
}

export function parseComparisonSelection(
  rawReferences: readonly string[],
  rawGoal?: string,
): ComparisonSelection {
  const references: AgentReference[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;
  let invalidCount = 0;
  let overflowCount = 0;

  for (const rawReference of rawReferences) {
    const reference = parseAgentReference(rawReference);

    if (!reference) {
      invalidCount += 1;
      continue;
    }

    const key = serializeAgentReference(reference);

    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(key);

    if (references.length >= maximumComparisonAgents) {
      overflowCount += 1;
      continue;
    }

    references.push(reference);
  }

  return {
    duplicateCount,
    goal: normalizeComparisonGoal(rawGoal),
    invalidCount,
    overflowCount,
    references,
  };
}

export function parseComparisonSearchParams(
  params: ComparisonSearchParams,
): ComparisonSelection {
  return parseComparisonSelection(
    values(params.agent),
    firstValue(params.goal),
  );
}

export function buildComparisonHref(
  references: readonly AgentReference[],
  goal = "",
): string {
  const selection = parseComparisonSelection(
    references.map(serializeAgentReference),
    goal,
  );
  const params = new URLSearchParams();

  for (const reference of selection.references) {
    params.append("agent", serializeAgentReference(reference));
  }

  if (selection.goal) {
    params.set("goal", selection.goal);
  }

  const serialized = params.toString();
  return serialized ? `/compare?${serialized}` : "/compare";
}

export function buildDiscoveryHrefForComparison(goal: string): string {
  const normalizedGoal = normalizeComparisonGoal(goal);
  const params = new URLSearchParams();

  if (normalizedGoal) {
    params.set("q", normalizedGoal);
  }

  const serialized = params.toString();
  return serialized ? `/discover?${serialized}` : "/discover";
}
