"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface CopyButtonProps {
  className?: string;
  label: string;
  value: string;
}

export function CopyButton({ className, label, value }: CopyButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    },
    [],
  );

  async function copyValue(): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }

    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
    }

    resetTimer.current = setTimeout(() => setStatus("idle"), 2_000);
  }

  const feedback =
    status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : "Copy";

  return (
    <button
      type="button"
      onClick={copyValue}
      aria-label={`${feedback} ${label}`}
      title={`${feedback} ${label}`}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[0.7rem] font-semibold text-muted-foreground outline-none transition-colors hover:border-input hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30",
        className,
      )}
    >
      {status === "copied" ? (
        <Check className="size-3.5 text-emerald-300" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
      <span aria-live="polite">{feedback}</span>
    </button>
  );
}
