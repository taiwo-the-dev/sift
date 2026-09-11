import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const agentArtworkStyles = [
  "bg-[radial-gradient(circle_at_18%_18%,rgba(240,185,11,0.22),transparent_11rem),linear-gradient(145deg,#20242b,#12151a)]",
  "bg-[radial-gradient(circle_at_82%_12%,rgba(240,185,11,0.18),transparent_10rem),linear-gradient(155deg,#171b20,#20242b)]",
  "bg-[radial-gradient(circle_at_50%_-15%,rgba(240,185,11,0.24),transparent_12rem),linear-gradient(145deg,#1d2127,#111419)]",
  "bg-[radial-gradient(circle_at_15%_85%,rgba(240,185,11,0.17),transparent_11rem),linear-gradient(155deg,#20242b,#12151a)]",
] as const;

interface AgentArtworkHeaderProps {
  children: ReactNode;
  className?: string;
  position: number;
}

/**
 * The shared decorative header used by every agent card: a position-varied
 * gradient, a faint dot grid, and two concentric rings. Callers place their
 * own badges/avatar/name inside via children.
 */
export function AgentArtworkHeader({
  children,
  className,
  position,
}: AgentArtworkHeaderProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border-b border-white/6 p-5",
        agentArtworkStyles[((position % agentArtworkStyles.length) + agentArtworkStyles.length) % agentArtworkStyles.length],
        className,
      )}
    >
      <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(234,236,239,0.24)_0.7px,transparent_0.7px)] [background-size:11px_11px]" />
      <div
        className="absolute top-1/2 -right-12 size-44 -translate-y-1/2 rounded-full border border-brand/10"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 -right-4 size-28 -translate-y-1/2 rounded-full border border-brand/10"
        aria-hidden="true"
      />
      <div className="relative">{children}</div>
    </div>
  );
}
