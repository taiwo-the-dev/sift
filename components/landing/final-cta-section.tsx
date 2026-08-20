import { ArrowRight, Search } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FinalCtaSection() {
  return (
    <section className="sift-dot-footer border-y border-border bg-card py-16 sm:py-20">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-brand px-6 py-8 text-brand-foreground sm:px-9 sm:py-10 lg:flex lg:items-center lg:justify-between lg:gap-12">
          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-foreground/70">
              Begin with your goal
            </p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Start with what you want to accomplish.
            </h2>
            <p className="mt-3 max-w-2xl text-pretty text-sm leading-6 text-brand-foreground/75 sm:text-base">
              Describe the job in plain language. Sift is designed to handle the
              technical discovery work behind it.
            </p>
          </div>

          <div className="relative z-10 mt-7 flex shrink-0 flex-col items-stretch gap-2 sm:flex-row sm:items-center lg:mt-0">
            <Link
              href="#agent-search"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-brand-foreground/15 bg-background px-6 text-foreground hover:bg-card",
              )}
            >
              <Search className="size-4" aria-hidden="true" />
              Find your agent
            </Link>
            <Link
              href="#categories"
              className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold text-brand-foreground outline-none transition-colors duration-200 hover:bg-brand-foreground/8 focus-visible:ring-3 focus-visible:ring-brand-foreground/30"
            >
              Explore categories
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
                aria-hidden="true"
              />
            </Link>
          </div>
          <span
            className="absolute -right-10 -top-20 size-64 rotate-45 border-[3rem] border-white/10"
            aria-hidden="true"
          />
        </div>
      </div>
    </section>
  );
}
