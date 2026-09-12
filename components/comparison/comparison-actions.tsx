"use client";

import { Copy, RotateCcw, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { replaceComparisonSelection } from "@/components/comparison/use-comparison-selection";
import { Button } from "@/components/ui/button";
import type { AgentReference } from "@/features/comparison/model";
import {
  buildComparisonHref,
  buildDiscoveryHrefForComparison,
} from "@/features/comparison/query";
import { cn } from "@/lib/utils";

interface SelectionActionProps {
  goal: string;
  references: readonly AgentReference[];
}

interface AgentSelectionActionsProps extends SelectionActionProps {
  className?: string;
  reference: AgentReference;
}

function withoutReference(
  references: readonly AgentReference[],
  reference: AgentReference,
): readonly AgentReference[] {
  return references.filter(
    (candidate) =>
      candidate.chainId !== reference.chainId ||
      candidate.agentId !== reference.agentId,
  );
}

export function AgentSelectionActions({
  className,
  goal,
  reference,
  references,
}: AgentSelectionActionsProps) {
  const router = useRouter();

  function remove(replace: boolean) {
    const nextReferences = withoutReference(references, reference);
    replaceComparisonSelection(nextReferences, goal);

    if (replace) {
      router.push(buildDiscoveryHrefForComparison(goal));
      return;
    }

    router.replace(buildComparisonHref(nextReferences, goal), { scroll: false });
  }

  return (
    <div className={cn("mt-4 flex flex-wrap gap-2", className)}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => remove(false)}
      >
        <X className="size-3.5" aria-hidden="true" />
        Remove
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => remove(true)}
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Replace
      </Button>
    </div>
  );
}

export function ComparisonPageActions() {
  const router = useRouter();
  const [copyStatus, setCopyStatus] = useState("");

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("Comparison link copied.");
    } catch {
      setCopyStatus("Copy was unavailable. Use the address in your browser.");
    }
  }

  function clear() {
    replaceComparisonSelection([], "");
    router.replace("/compare", { scroll: false });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" onClick={copyShareLink}>
        <Copy className="size-4" aria-hidden="true" />
        Copy share link
      </Button>
      <Button type="button" variant="ghost" onClick={clear}>
        <Trash2 className="size-4" aria-hidden="true" />
        Clear all
      </Button>
      <span className="sr-only" aria-live="polite">
        {copyStatus}
      </span>
      {copyStatus ? (
        <span className="w-full text-xs text-muted-foreground sm:w-auto">
          {copyStatus}
        </span>
      ) : null}
    </div>
  );
}
