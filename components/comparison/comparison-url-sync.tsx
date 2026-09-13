"use client";

import { useEffect } from "react";

import { replaceComparisonSelection } from "@/components/comparison/use-comparison-selection";
import type { AgentReference } from "@/features/comparison/model";

interface ComparisonUrlSyncProps {
  chainId: 56 | 97;
  goal: string;
  references: readonly AgentReference[];
}

export function ComparisonUrlSync({
  chainId,
  goal,
  references,
}: ComparisonUrlSyncProps) {
  useEffect(() => {
    replaceComparisonSelection(references, goal, chainId);
  }, [chainId, goal, references]);

  return null;
}
