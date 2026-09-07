"use client";

import {
  ArrowRight,
  Bookmark,
  LoaderCircle,
  Tag,
} from "lucide-react";
import Link from "next/link";

import { BookmarkToggle } from "@/components/bookmarks/bookmark-toggle";
import { useBookmarks } from "@/components/bookmarks/use-bookmarks";
import { AgentAvatar } from "@/components/discovery/agent-avatar";
import { buttonVariants } from "@/components/ui/button";
import { buildAgentProfileHref } from "@/features/agents/route";
import { shouldShowOtherCategory } from "@/features/categories/presentation";
import {
  formatAgentDescription,
  formatAgentName,
  formatCategory,
  formatChainName,
  formatMetadataStatus,
} from "@/features/discovery/format";
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
          Loading saved agents…
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
          No saved agents yet
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
          Save agents while browsing to keep a shortlist on this device.
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
            {bookmarks.count} saved {bookmarks.count === 1 ? "agent" : "agents"}
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
        {bookmarks.agents.map((agent) => {
          const name = formatAgentName(agent.name, agent.agentId);
          const href = buildAgentProfileHref(agent.chainId, agent.agentId);
          const showOtherCategory = shouldShowOtherCategory(
            agent.metadataStatus,
            agent.categories,
          );

          return (
            <article
              key={`${agent.chainId}:${agent.agentId}`}
              className="sift-card-reveal group flex min-h-80 flex-col rounded-2xl border border-border bg-card p-5 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-brand/35 hover:shadow-[0_20px_48px_rgba(0,0,0,0.24)] motion-reduce:transform-none"
            >
              <div className="flex items-start gap-4">
                <AgentAvatar
                  agentId={agent.agentId}
                  imageUrl={agent.imageUrl}
                  name={name}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-brand">
                    {formatChainName(agent.chainId)}
                  </p>
                  <h2 className="mt-1.5 line-clamp-2 text-xl font-semibold tracking-[-0.025em] text-foreground">
                    {name}
                  </h2>
                  <p className="mt-1 font-mono text-[0.68rem] text-muted-foreground">
                    ERC-8004 agent #{agent.agentId}
                  </p>
                </div>
              </div>

              <p className="mt-5 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {formatAgentDescription(agent.description)}
              </p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {agent.categories.slice(0, 3).map((category) => (
                  <span
                    key={category}
                    className="inline-flex items-center gap-1 rounded-md border border-brand/20 bg-brand/8 px-2 py-1 text-[0.68rem] font-medium text-brand"
                  >
                    <Tag className="size-3" aria-hidden="true" />
                    {formatCategory(category)}
                  </span>
                ))}
                {showOtherCategory ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[0.68rem] font-medium text-muted-foreground">
                    <Tag className="size-3" aria-hidden="true" />
                    Other
                  </span>
                ) : null}
                <span className="rounded-md border border-border bg-background px-2 py-1 text-[0.68rem] text-muted-foreground">
                  {formatMetadataStatus(agent.metadataStatus)}
                </span>
              </div>

              <div className="mt-auto flex items-center gap-2 border-t border-border pt-5">
                {href ? (
                  <Link
                    href={href}
                    className={cn(
                      buttonVariants({ variant: "brand" }),
                      "flex-1",
                    )}
                  >
                    View profile
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
                <BookmarkToggle agent={agent} variant="icon" />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
