import { ArrowRight, Blocks, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { HeroBackground } from "@/components/landing/hero-background";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="sift-hero-field relative overflow-hidden border-b border-border bg-background">
      <HeroBackground />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-16 text-center sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <p className="inline-flex items-center justify-center gap-2 rounded-full border border-brand/25 bg-brand/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          <span
            className="size-1.5 rounded-full bg-brand shadow-[0_0_12px_rgba(240,185,11,0.8)]"
            aria-hidden="true"
          />
          AI agents on BNB Chain
        </p>

        <h1 className="mx-auto mt-7 max-w-5xl text-balance text-[clamp(3rem,6.5vw,5.75rem)] font-semibold leading-[0.95] tracking-[-0.065em] text-foreground">
          Find the right <span className="text-brand">AI agent</span>
          <span className="block">for the job.</span>
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-xl sm:leading-8">
          Search ERC-8004 agents on BNB Chain. Compare their capabilities,
          service health, and available data before you hire one.
        </p>

        <div
          id="agent-search"
          className="mx-auto mt-10 min-w-0 max-w-4xl scroll-mt-24 rounded-2xl border border-brand/35 bg-card/90 p-2 text-left shadow-[0_24px_90px_rgba(0,0,0,0.42),0_0_45px_rgba(240,185,11,0.06)] backdrop-blur-sm sm:p-2.5"
        >
          <form
            action="/discover"
            method="get"
            className="min-w-0"
          >
            <label htmlFor="landing-goal" className="sr-only">
              What do you need an agent to do?
            </label>
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="relative min-w-0">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-brand"
                  aria-hidden="true"
                />
                <input
                  id="landing-goal"
                  name="q"
                  type="search"
                  required
                  minLength={3}
                  maxLength={180}
                  placeholder="Describe a task, e.g. monitor my lending position"
                  className="h-14 w-full min-w-0 rounded-xl border border-transparent bg-background/80 pl-12 pr-4 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/15 sm:text-base"
                />
              </div>
              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="h-14 rounded-xl px-7"
              >
                Search agents
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </form>
        </div>

        <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Blocks className="size-3.5 text-brand" aria-hidden="true" />
            ERC-8004 agents on BNB Chain
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-3.5 text-brand" aria-hidden="true" />
            Data linked to its source
          </span>
          <Link
            href="/discover"
            className="inline-flex items-center gap-1.5 font-semibold text-foreground hover:text-brand"
          >
            Browse all agents
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
