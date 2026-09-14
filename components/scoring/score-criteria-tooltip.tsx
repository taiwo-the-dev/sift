"use client";

import { Tooltip } from "@base-ui/react/tooltip";
import { CircleHelp } from "lucide-react";

import type { ScoreComponents } from "@/features/scoring/model";
import {
  calculateScoreComponentPoints,
  scoreComponentDefinitions,
} from "@/features/scoring/formula";
import { cn } from "@/lib/utils";

interface ScoreCriteriaTooltipProps {
  className?: string;
  components: ScoreComponents;
}

function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function ScoreCriteriaTooltip({
  className,
  components,
}: ScoreCriteriaTooltipProps) {
  const rows = scoreComponentDefinitions.map((definition) => ({
    ...definition,
    contribution: calculateScoreComponentPoints(
      components[definition.key],
      definition.weight,
    ),
  }));

  const control = (
    <button
      type="button"
      aria-label="How the Sift Score is calculated"
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30",
        className,
      )}
    >
      <CircleHelp className="size-3.5" aria-hidden="true" />
    </button>
  );

  return (
    <Tooltip.Root>
      <Tooltip.Trigger delay={200} closeDelay={100} render={control} />
      <Tooltip.Portal>
        <Tooltip.Positioner side="top" sideOffset={8} className="z-[70]">
          <Tooltip.Popup className="w-[min(19rem,calc(100vw-2rem))] origin-[var(--transform-origin)] rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl shadow-black/45 outline-none transition-[opacity,transform] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
            <span className="block text-sm font-semibold">Sift Score criteria</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              The six earned point values are added to produce the score out of
              100.
            </span>

            <dl className="mt-3 divide-y divide-border">
              {rows.map((row) => (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-4 py-2 text-xs"
                >
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="shrink-0 font-mono font-medium text-foreground">
                    {formatPoints(row.contribution ?? 0)}
                  </dd>
                </div>
              ))}
            </dl>

            <span className="mt-3 block border-t border-border pt-3 text-[0.68rem] leading-4 text-muted-foreground">
              Missing or expired evidence earns no points. Evidence coverage is
              shown separately.
            </span>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
