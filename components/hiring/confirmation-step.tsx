import { ArrowUpRight, BadgeCheck, ExternalLink, LayoutDashboard } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type {
  HiringAgentSummary,
  HiringIntentSnapshot,
} from "@/features/hiring/model";
import {
  buildHiringTransactionHref,
  getErc8183Deployment,
} from "@/features/hiring/protocol";
import { cn } from "@/lib/utils";

export function ConfirmationStep({
  agent,
  intent,
}: Readonly<{
  agent: HiringAgentSummary;
  intent: HiringIntentSnapshot;
}>) {
  const deployment = getErc8183Deployment(agent.chainId);
  const hash = intent.transactionHash;

  return (
    <section className="py-2 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
        <BadgeCheck className="size-8" aria-hidden="true" />
      </div>
      <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
        Step 5 · Confirmed on-chain
      </p>
      <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight text-foreground">
        ERC-8183 job #{intent.onchainJobId} is funded.
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
        {agent.name} is the named provider for this ERC-8183 job on {deployment.networkName}.
        This confirms escrow funding, not delivery or successful completion.
      </p>

      <dl className="mx-auto mt-8 max-w-3xl overflow-hidden rounded-xl border border-border bg-card text-left">
        <div className="grid gap-1 border-b border-border px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <dt className="text-xs text-muted-foreground">ERC-8183 job ID</dt>
          <dd className="text-sm font-semibold text-foreground">{intent.onchainJobId}</dd>
        </div>
        <div className="grid gap-1 border-b border-border px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <dt className="text-xs text-muted-foreground">Provider</dt>
          <dd className="text-sm text-foreground">{agent.name}</dd>
        </div>
        <div className="grid gap-1 border-b border-border px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <dt className="text-xs text-muted-foreground">Task description</dt>
          <dd className="text-sm leading-6 text-foreground">{intent.mission}</dd>
        </div>
        <div className="grid gap-1 border-b border-border px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <dt className="text-xs text-muted-foreground">Network</dt>
          <dd className="text-sm text-foreground">
            {deployment.networkName} · chain {deployment.chainId}
          </dd>
        </div>
        <div className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <dt className="text-xs text-muted-foreground">Funding transaction</dt>
          <dd className="min-w-0 text-sm text-foreground">
            {hash ? (
              <a
                className="inline-flex max-w-full items-center gap-1.5 break-all underline decoration-border underline-offset-4 hover:text-brand"
                href={buildHiringTransactionHref(deployment.chainId, hash)}
                rel="noreferrer noopener"
                target="_blank"
              >
                {hash}
                <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
              </a>
            ) : (
              "Receipt unavailable"
            )}
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/dashboard" className={cn(buttonVariants({ size: "lg" }))}>
          Monitor in dashboard
          <LayoutDashboard className="size-4" aria-hidden="true" />
        </Link>
        <Link href={agent.profileHref} className={cn(buttonVariants({ size: "lg" }))}>
          View agent profile
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
        <Link href="/discover" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
          Return to Discover
        </Link>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        The dashboard asks this same wallet for a read-only ownership signature
        before showing its private agent task record.
      </p>
    </section>
  );
}
