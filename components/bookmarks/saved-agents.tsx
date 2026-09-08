"use client";

import { ArrowRight, Bookmark, LoaderCircle } from "lucide-react";
import Link from "next/link";

import { AgentShowcaseCard } from "@/components/agents/agent-showcase-card";
import { useBookmarks } from "@/components/bookmarks/use-bookmarks";
import { buttonVariants } from "@/components/ui/button";
import { formatRegistrationDate } from "@/features/discovery/format";
import { cn } from "@/lib/utils";

export function SavedAgents() {
  const bookmarks = useBookmarks();

  if (!bookmarks.ready) {
    return (
      <div
        role="status"
        className="flex min-h-72 items-center justify-center rounded-2xl border border-border bg-card"
      >
        <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
          <LoaderCircle
            className="size-4 animate-spin text-brand motion-reduce:animate-none"
            aria-hidden="true"
          />
          Loading bookmarks…
        </p>
      </div>
    );
  }

  if (bookmarks.agents.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-14 text-center sm:px-8">
        <span className="mx-auto grid size-12 place-items-center rounded-xl border border-brand/25 bg-brand/8 text-brand">
          <Bookmark className="size-5" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-foreground">
          No bookmarks yet
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          Bookmark agents while browsing to keep a shortlist on this device.
        </p>
        <Link
          href="/discover"
          className={cn(
            buttonVariants({ variant: "brand", size: "lg" }),
            "mt-7",
          )}
        >
          Discover agents
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    );
  }

  return (
    <div className="sift-data-arrival">
      <div className="mb-6 flex items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Your shortlist
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {bookmarks.count} bookmarked {bookmarks.count === 1 ? "agent" : "agents"}
          </p>
        </div>
        <Link
          href="/discover"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Find more
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bookmarks.agents.map((agent, index) => (
          <AgentShowcaseCard
            key={`${agent.chainId}:${agent.agentId}`}
            agent={agent}
            dateLabel="Bookmarked"
            dateValue={formatRegistrationDate(agent.savedAt)}
            position={index}
          />
        ))}
      </div>
    </div>
  );
}
