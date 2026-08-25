import { BriefcaseBusiness, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

import { DashboardPageClient } from "@/components/dashboard/dashboard-page-client";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "My Agents dashboard",
  description:
    "Monitor real Sift hiring jobs, verified ERC-8183 state, and attributable wallet activity.",
  noIndex: true,
  path: "/dashboard",
});

export default function DashboardPage() {
  return (
    <div className="min-w-0 flex-1 bg-background">
      <section className="relative overflow-hidden border-b border-border bg-card">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_86%_12%,rgba(240,185,11,0.17),transparent_29rem),linear-gradient(120deg,transparent_0%,rgba(240,185,11,0.035)_64%,transparent_100%)]" />
        <div className="relative mx-auto grid w-full max-w-7xl gap-7 px-4 py-11 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:px-8">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
              <BriefcaseBusiness className="size-4" aria-hidden="true" />
              Wallet control centre
            </p>
            <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.045em] text-foreground sm:text-5xl">
              Monitor every verified job state.
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
              Follow persisted missions, ERC-8183 status, and attributable activity without turning unavailable evidence into invented performance.
            </p>
          </div>
          <div className="flex max-w-sm gap-3 rounded-xl border border-brand/20 bg-background/80 p-4">
            <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden="true" />
            <p className="text-xs leading-5 text-muted-foreground">
              Job records remain hidden until the connected wallet proves ownership with a read-only signature.
            </p>
          </div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <DashboardPageClient />
      </div>
    </div>
  );
}
