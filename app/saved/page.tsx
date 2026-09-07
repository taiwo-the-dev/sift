import { Bookmark } from "lucide-react";
import type { Metadata } from "next";

import { SavedAgents } from "@/components/bookmarks/saved-agents";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Saved agents",
  description: "Review AI agents saved on this device.",
  noIndex: true,
  path: "/saved",
});

export default function SavedAgentsPage() {
  return (
    <div className="min-w-0 flex-1 bg-background">
      <section className="relative overflow-hidden border-b border-border bg-card">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(circle_at_82%_0%,rgba(240,185,11,0.16),transparent_30rem)]"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            <Bookmark className="size-4" aria-hidden="true" />
            Saved agents
          </p>
          <h1 className="mt-4 max-w-3xl text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
            Keep your strongest candidates close.
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
            Build a shortlist while you browse. Saved agents stay in this
            browser and link back to their current Sift profile.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <SavedAgents />
      </section>
    </div>
  );
}
