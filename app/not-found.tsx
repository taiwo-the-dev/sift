import { ArrowLeft, SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Page not found",
  description: "The requested Sift page could not be found.",
  robots: { follow: false, index: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <section className="w-full rounded-xl border border-border bg-card px-6 py-12 text-center sm:px-10 sm:py-16">
        <span className="mx-auto grid size-12 place-items-center rounded-xl border border-brand/20 bg-brand/8 text-brand">
          <SearchX className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          404 · Page not found
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
          This route isn’t in the Sift catalogue
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          The address may be outdated or mistyped. Return home or browse the
          currently indexed ERC-8004 agents.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">
          <Link
            href="/discover"
            className={cn(buttonVariants({ variant: "brand", size: "lg" }))}
          >
            Browse agents
          </Link>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Return home
          </Link>
        </div>
      </section>
    </div>
  );
}
