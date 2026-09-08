"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { useState } from "react";

import { useBookmarks } from "@/components/bookmarks/use-bookmarks";
import { Button } from "@/components/ui/button";
import type { BookmarkableAgent } from "@/features/bookmarks/model";
import { maximumBookmarkedAgents } from "@/features/bookmarks/model";
import { cn } from "@/lib/utils";

interface BookmarkToggleProps {
  agent: BookmarkableAgent;
  className?: string;
  variant?: "compact" | "default" | "icon";
}

export function BookmarkToggle({
  agent,
  className,
  variant = "default",
}: BookmarkToggleProps) {
  const bookmarks = useBookmarks();
  const [announcement, setAnnouncement] = useState("");
  const saved = bookmarks.isBookmarked(agent);
  const unavailable = !saved && bookmarks.isFull;
  const iconOnly = variant === "icon";

  return (
    <Button
      type="button"
      variant="outline"
      size={iconOnly ? "icon" : variant === "compact" ? "sm" : "default"}
      disabled={unavailable}
      aria-pressed={saved}
      aria-label={
        saved
          ? `Remove bookmark for agent ${agent.agentId}`
          : unavailable
            ? `Bookmark limit reached at ${maximumBookmarkedAgents}`
            : `Bookmark agent ${agent.agentId}`
      }
      title={
        unavailable
          ? `Remove a bookmark before adding another (maximum ${maximumBookmarkedAgents})`
          : saved
            ? "Remove bookmark"
            : "Bookmark agent"
      }
      className={cn(
        saved && "border-brand/35 bg-brand/8 text-brand hover:bg-brand/12",
        className,
      )}
      onClick={() => {
        bookmarks.toggle(agent);
        setAnnouncement(
          saved
            ? `Bookmark removed for agent ${agent.agentId}.`
            : `Agent ${agent.agentId} bookmarked on this device.`,
        );
      }}
    >
      {saved ? (
        <BookmarkCheck className="size-3.5" aria-hidden="true" />
      ) : (
        <Bookmark className="size-3.5" aria-hidden="true" />
      )}
      {iconOnly ? null : saved ? "Bookmarked" : "Bookmark"}
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </Button>
  );
}
