"use client";

import { Check, Plus, X } from "lucide-react";
import { useState } from "react";

import { useComparisonSelection } from "@/components/comparison/use-comparison-selection";
import { Button } from "@/components/ui/button";
import type { AgentReference } from "@/features/comparison/model";
import { maximumComparisonAgents } from "@/features/comparison/model";
import { cn } from "@/lib/utils";

interface ComparisonToggleProps {
  className?: string;
  goal?: string;
  reference: AgentReference;
  variant?: "compact" | "default";
}

export function ComparisonToggle({
  className,
  goal,
  reference,
  variant = "default",
}: ComparisonToggleProps) {
  const comparison = useComparisonSelection();
  const [announcement, setAnnouncement] = useState("");
  const selected = comparison.isSelected(reference);
  const unavailable = comparison.isFull && !selected;
  const count = comparison.references.length;

  return (
    <Button
      type="button"
      variant={selected ? "outline" : "brand"}
      size={variant === "compact" ? "sm" : "default"}
      disabled={unavailable}
      aria-pressed={selected}
      aria-label={
        selected
          ? `Remove agent ${reference.agentId} from comparison`
          : unavailable
            ? `Comparison is full at ${maximumComparisonAgents} agents`
            : `Add agent ${reference.agentId} to comparison`
      }
      title={
        unavailable
          ? `Remove an agent before adding another (maximum ${maximumComparisonAgents})`
          : undefined
      }
      className={cn(className)}
      onClick={() => {
        if (selected) {
          comparison.remove(reference);
          setAnnouncement(
            `Agent ${reference.agentId} removed from comparison.`,
          );
          return;
        }

        comparison.add(reference, goal);
        setAnnouncement(
          `Agent ${reference.agentId} added to comparison.`,
        );
      }}
    >
      {selected ? (
        <X className="size-3.5" aria-hidden="true" />
      ) : unavailable ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <Plus className="size-3.5" aria-hidden="true" />
      )}
      {selected ? "Remove" : unavailable ? "Limit reached" : "Compare"} · {count}/
      {maximumComparisonAgents}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </Button>
  );
}
