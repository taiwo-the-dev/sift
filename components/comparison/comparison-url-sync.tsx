"use client";

import { useEffect } from "react";

import { replaceComparisonSelection } from "@/components/comparison/use-comparison-selection";
import type { AgentReference } from "@/features/comparison/model";

interface ComparisonUrlSyncProps {
  goal: string;
  references: readonly AgentReference[];
}

export function ComparisonUrlSync({
  goal,
  references,
}: ComparisonUrlSyncProps) {
  useEffect(() => {
    replaceComparisonSelection(references, goal);
  }, [goal, references]);

  return null;
}
