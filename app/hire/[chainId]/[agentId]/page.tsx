import { CircleAlert, CircleCheck, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { HiringFlow } from "@/components/hiring/hiring-flow";
import { buttonVariants } from "@/components/ui/button";
import { parseAgentProfileIdentity } from "@/features/agents/route";
import { getAgentProfile } from "@/features/agents/service";
import {
  assessHiringCompatibility,
  toHiringAgentSummary,
} from "@/features/hiring/compatibility";
import { HIRING_NETWORK_NAME } from "@/features/hiring/protocol";
import { createPageMetadata } from "@/lib/metadata";
import { cn } from "@/lib/utils";

interface HirePageProps {
  params: Promise<Readonly<{ agentId: string; chainId: string }>>;
}

export async function generateMetadata({
  params,
}: HirePageProps): Promise<Metadata> {
  const { agentId, chainId } = await params;
  const identity = parseAgentProfileIdentity(chainId, agentId);
  const path = identity
    ? (`/hire/${identity.chainId}/${identity.agentId}` as const)
    : "/discover";

  return createPageMetadata({
    title: "Hire an AI agent",
    description:
      "Create a bounded ERC-8183 job with a compatible indexed agent on BSC Testnet.",
    noIndex: true,
    path,
  });
}

export default async function HirePage({ params }: HirePageProps) {
  const { agentId, chainId } = await params;
  const identity = parseAgentProfileIdentity(chainId, agentId);

  if (!identity) notFound();

  const profile = await getAgentProfile(identity.chainId, identity.agentId);

  if (!profile) notFound();

  const compatibility = assessHiringCompatibility(profile);
  const alternativeParams = new URLSearchParams({
    metadata: "valid",
    network: "bsc-testnet",
    q: "ERC-8183",
  });
  const firstCategory = profile.categories[0];

  if (firstCategory) {
    alternativeParams.set("category", firstCategory);
  }

  return (
    <div className="flex-1 bg-background">
      <div className="border-b border-border bg-card/45">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            Testnet hiring
          </p>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Turn a clear mission into a bounded on-chain job.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Negotiate a signed provider quote, review the enforceable terms, and
            explicitly confirm each {HIRING_NETWORK_NAME} transaction.
          </p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {compatibility.compatibility ? (
          <HiringFlow agent={toHiringAgentSummary(profile)} />
        ) : (
          <section className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-7 text-center sm:p-10">
            <div className="mx-auto grid size-14 place-items-center rounded-full border border-amber-400/25 bg-amber-400/8 text-amber-300">
              <CircleAlert className="size-6" aria-hidden="true" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-foreground">
              {compatibility.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {compatibility.explanation} Sift will not invent a quote,
              provider, or transaction.
            </p>
            <ul className="mx-auto mt-6 max-w-lg space-y-2 text-left">
              {compatibility.checks.map((item) => (
                <li
                  key={item.key}
                  className="flex items-start gap-2 rounded-lg border border-border bg-background/45 px-3 py-2.5 text-xs leading-5 text-muted-foreground"
                >
                  {item.status === "pass" ? (
                    <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
                  ) : (
                    <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-300" aria-hidden="true" />
                  )}
                  <span>
                    <strong className="font-semibold text-foreground">{item.label}:</strong>{" "}
                    {item.detail}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href={`/agents/${profile.chainId}/${profile.agentId}?tab=services`} className={cn(buttonVariants({ size: "lg" }))}>
                Review declared services
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
              <Link href={`/discover?${alternativeParams.toString()}`} className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
                Find declared ERC-8183 alternatives
              </Link>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
