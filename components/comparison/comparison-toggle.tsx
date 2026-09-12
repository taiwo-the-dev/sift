"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { Columns2, X } from "lucide-react";
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
  const tooltipTitle = selected ? "Remove from compare" : "Compare agents";
  const tooltipDescription = selected
    ? "Remove this agent from your comparison."
    : "View this agent side by side with others.";

  const control = (
    <Button
      type="button"
      variant={selected ? "outline" : iconOnly ? "outline" : "brand"}
      size={iconOnly ? "icon" : variant === "compact" ? "sm" : "default"}
      disabled={unavailable}
      aria-pressed={selected}
      aria-label={label}
      title={
        !iconOnly && unavailable
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
        <Columns2 className="size-3.5" aria-hidden="true" />
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

  if (!iconOnly || unavailable) {
    return control;
  }

  return (
    <Tooltip.Root>
      <Tooltip.Trigger delay={250} closeDelay={80} render={control} />
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={8} className="z-50">
          <Tooltip.Popup className="origin-[var(--transform-origin)] rounded-lg border border-border bg-popover px-3 py-2 text-popover-foreground shadow-xl shadow-black/40 outline-none transition-[opacity,transform] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <span className="block text-xs font-semibold">{tooltipTitle}</span>
            <span className="mt-0.5 block max-w-52 text-[0.65rem] leading-4 text-muted-foreground">
              {tooltipDescription}
            </span>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
