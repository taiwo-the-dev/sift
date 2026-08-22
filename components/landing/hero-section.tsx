import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";

import { agentCategories } from "@/components/landing/categories";
import { HeroBackground } from "@/components/landing/hero-background";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="sift-hero-field relative overflow-hidden border-b border-border bg-background">
      <HeroBackground />

      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-20 text-center sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <p className="inline-flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          <span className="size-1.5 bg-brand" aria-hidden="true" />
          Agent discovery on BNB Chain
        </p>

        <h1 className="mx-auto mt-7 max-w-5xl text-balance text-[clamp(2.8rem,5.5vw,4.5rem)] font-semibold uppercase leading-[0.98] tracking-[-0.055em] text-foreground">
          <span>Find the right</span>
          <span className="text-brand"> AI agent</span>
          <span className="block">for the job.</span>
        </h1>
        <p className="mx-auto mt-7 max-w-3xl text-pretty text-lg leading-8 text-muted-foreground sm:text-xl">
          Turn a plain-language goal into a clear path to discover, compare and
          safely hire autonomous agents on BNB Chain.
        </p>

        <div
          id="agent-search"
          className="mx-auto mt-10 min-w-0 max-w-5xl scroll-mt-24 rounded-xl border border-border bg-card/95 p-4 text-left sm:p-5"
        >
          <form
            action="/discover"
            method="get"
            className="min-w-0"
            aria-describedby="agent-search-help"
          >
            <label
              htmlFor="landing-goal"
              className="text-sm font-semibold text-foreground"
            >
              What do you want an agent to do?
            </label>
            <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="relative min-w-0">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  id="landing-goal"
                  name="q"
                  type="search"
                  required
                  minLength={3}
                  maxLength={180}
                  placeholder="Help me find low-risk yield for my USDT"
                  className="h-13 w-full min-w-0 rounded-lg border border-input bg-background pl-12 pr-4 text-sm text-foreground outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/70 focus:border-ring focus:ring-3 focus:ring-ring/15"
                />
              </div>
              <Button
                type="submit"
                variant="brand"
                size="lg"
                className="h-13 px-6"
              >
                Find agents
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </form>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:items-center lg:flex-row lg:justify-center">
            <p
              id="agent-search-help"
              className="shrink-0 text-xs text-muted-foreground"
            >
              Try a goal
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 sm:justify-center">
              {agentCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <Link
                    key={category.shortcut}
                    href={`/discover?category=${category.slug}`}
                    className="group inline-flex items-center gap-2 rounded-sm text-sm font-medium text-foreground outline-none transition-colors hover:text-brand focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    <Icon
                      className="size-3.5 text-muted-foreground group-hover:text-brand"
                      aria-hidden="true"
                    />
                    {category.shortcut}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
