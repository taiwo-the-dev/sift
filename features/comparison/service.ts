import "server-only";

import { cache } from "react";

import type {
  AgentReference,
  ComparisonResult,
} from "@/features/comparison/model";
import { createComparisonRepository } from "@/lib/db/comparison-repository";

export const getAgentComparison = cache(
  async (references: readonly AgentReference[]): Promise<ComparisonResult> =>
    createComparisonRepository().findByReferences(references),
);
