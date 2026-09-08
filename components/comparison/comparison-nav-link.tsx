"use client";

import { Scale } from "lucide-react";
import Link from "next/link";

import { useComparisonSelection } from "@/components/comparison/use-comparison-selection";
import { cn } from "@/lib/utils";

interface ComparisonNavLinkProps {
  active?: boolean;
  className?: string;
  mobile?: boolean;
  onNavigate?: () => void;
}

export function ComparisonNavLink({
  active = false,
  className,
  mobile = false,
  onNavigate,
}: ComparisonNavLinkProps) {
  const comparison = useComparisonSelection();
  const count = comparison.references.length;

  return (
    <Link
      href={comparison.href}
      onClick={onNavigate}
      className={cn(className)}
      aria-label={count > 0 ? `Compare ${count} selected agents` : "Compare agents"}
      aria-current={active ? "page" : undefined}
    >
      {mobile ? <Scale className="size-4 text-brand" aria-hidden="true" /> : null}
      Compare
      {count > 0 ? (
        <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 py-0.5 text-[0.65rem] font-bold leading-none text-brand-foreground">
          {count}
        </span>
      ) : null}
    </Link>
  );
}
