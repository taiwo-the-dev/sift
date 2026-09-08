import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { HiringAgentContent } from "@/components/hiring/hiring-agent-content";
import { HiringAgentLoading } from "@/components/hiring/hiring-agent-loading";
import { parseAgentProfileIdentity } from "@/features/agents/route";
import {
  getErc8183Deployment,
  isHiringChainId,
} from "@/features/hiring/protocol";
import { createPageMetadata } from "@/lib/metadata";

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
  const networkName =
    identity && isHiringChainId(identity.chainId)
      ? getErc8183Deployment(identity.chainId).networkName
      : "a supported BNB network";

  return createPageMetadata({
    title: "Hire an AI agent",
    description:
      `Create an ERC-8183 job with spending and time limits on ${networkName}.`,
    noIndex: true,
    path,
  });
}

export default async function HirePage({ params }: HirePageProps) {
  const { agentId, chainId } = await params;
  const identity = parseAgentProfileIdentity(chainId, agentId);

  if (!identity) notFound();

  const deployment = isHiringChainId(identity.chainId)
    ? getErc8183Deployment(identity.chainId)
    : null;

  return (
    <div className="flex-1 bg-background">
      <div className="border-b border-border bg-card/45">
        <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">
            {deployment ? `${deployment.networkName} hiring` : "Agent hiring"}
          </p>
          <h1 className="mt-2 text-balance text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
            Set up a task and hire safely.
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Describe the work, get a signed price, review the spending limits,
            and approve the hire on {deployment?.networkName ?? "BNB Chain"}.
          </p>
        </div>
      </div>

      <Suspense fallback={<HiringAgentLoading />}>
        <HiringAgentContent identity={identity} />
      </Suspense>
    </div>
  );
}
