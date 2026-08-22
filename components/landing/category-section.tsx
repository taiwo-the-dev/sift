import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { agentCategories } from "@/components/landing/categories";

export function CategorySection() {
  return (
    <section id="categories" className="scroll-mt-24 border-y border-border bg-card py-20 sm:py-24">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Explore by category
            </p>
            <h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-5xl">
              What should your <span className="text-brand">agent do?</span>
            </h2>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              Start with a familiar outcome, then move toward evidence and
              comparison as verified agent data becomes available.
            </p>
          </div>
          <Link
            href="/discover#discovery-search"
            className="group inline-flex items-center gap-2 self-start rounded-md text-sm font-semibold text-foreground outline-none transition-colors duration-200 hover:text-brand-strong focus-visible:ring-3 focus-visible:ring-ring/30 sm:mb-1 sm:self-auto"
          >
            Describe your own goal
            <ArrowRight
              className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="mt-12 rounded-2xl border border-brand/80 p-3 sm:p-5">
          <div className="flex items-center justify-between gap-4 border-b border-border px-2 pb-4 sm:px-1">
            <p className="text-sm font-semibold text-foreground">
              Core discovery routes
            </p>
            <p className="hidden text-xs uppercase tracking-[0.14em] text-muted-foreground sm:block">
              Choose an outcome
            </p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {agentCategories.map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.title}
                  href={`/discover?category=${category.slug}`}
                  className="group grid min-h-52 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 rounded-xl border border-border bg-background p-5 outline-none transition-[border-color,background-color] duration-200 hover:border-input hover:bg-secondary/55 focus-visible:ring-3 focus-visible:ring-ring/30 sm:p-6"
                >
                  <Icon className="mt-0.5 size-5 text-brand" aria-hidden="true" />
                  <div className="flex h-full flex-col">
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-foreground">
                      {category.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      {category.description}
                    </p>
                    <p className="mt-auto pt-6 text-sm font-semibold text-foreground transition-colors group-hover:text-brand">
                      Explore this category
                    </p>
                  </div>
                  <ArrowUpRight
                    className="size-4 text-muted-foreground transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand motion-reduce:transform-none"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
