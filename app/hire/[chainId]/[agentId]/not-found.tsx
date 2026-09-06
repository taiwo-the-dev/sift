import { CircleAlert } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HireNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 items-center px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <section className="w-full rounded-xl border border-border bg-card px-6 py-12 text-center sm:px-10 sm:py-16">
        <span className="mx-auto grid size-12 place-items-center rounded-xl border border-amber-400/25 bg-amber-400/8 text-amber-300">
          <CircleAlert className="size-5" aria-hidden="true" />
        </span>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          Agent hiring unavailable
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-foreground sm:text-3xl">
          Agent not found
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Check the network and agent ID, or return to Discover. No transaction
          has been created.
        </p>
        <Link
          href="/discover"
          className={cn(buttonVariants({ variant: "brand", size: "lg" }), "mt-7")}
        >
          Find another agent
        </Link>
      </section>
    </div>
  );
}
