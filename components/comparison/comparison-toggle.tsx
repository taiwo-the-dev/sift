"use client";

import { Scale, X } from "lucide-react";
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
  variant?: "compact" | "default" | "icon";
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
  const iconOnly = variant === "icon";
  const label = selected
    ? `Remove agent ${reference.agentId} from comparison`
    : unavailable
      ? `Comparison is full at ${maximumComparisonAgents} agents`
      : `Add agent ${reference.agentId} to comparison`;

  return (
    <Button
      type="button"
      variant={selected ? "outline" : iconOnly ? "outline" : "brand"}
      size={iconOnly ? "icon" : variant === "compact" ? "sm" : "default"}
      disabled={unavailable}
      aria-pressed={selected}
      aria-label={label}
      title={
        iconOnly
          ? label
          : unavailable
            ? `Remove an agent before adding another (maximum ${maximumComparisonAgents})`
            : undefined
      }
      className={cn(
        iconOnly && selected && "border-brand/35 bg-brand/8 text-brand hover:bg-brand/12",
        className,
      )}
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
      ) : (
        <Scale className="size-3.5" aria-hidden="true" />
      )}
      {iconOnly ? null : (
        <>
          {selected ? "Remove" : unavailable ? "Limit reached" : "Compare"} ·{" "}
          {count}/{maximumComparisonAgents}
        </>
      )}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </Button>
  );
}
