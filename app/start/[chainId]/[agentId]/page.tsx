import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { StartTaskFlow } from "@/components/activation/start-task-flow";
import { parseAgentProfileIdentity } from "@/features/agents/route";
import { getAgentProfile } from "@/features/agents/service";
import {
  formatAgentName,
  formatServiceType,
} from "@/features/discovery/format";
import {
  currentActivationServices,
  externalAgentServices,
} from "@/features/activation/service";
import { createPageMetadata } from "@/lib/metadata";

type Props = Readonly<{
  params: Promise<Readonly<{ agentId: string; chainId: string }>>;
}>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { agentId, chainId } = await params;
  return createPageMetadata({
    description: "Choose a checked way to start work with this BNB Chain agent.",
    noIndex: true,
    path: `/start/${chainId}/${agentId}`,
    title: "Start task",
  });
}

export default async function StartTaskPage({ params }: Props) {
  const { agentId, chainId } = await params;
  const identity = parseAgentProfileIdentity(chainId, agentId);
  if (!identity) notFound();
  const profile = await getAgentProfile(identity.chainId, identity.agentId);
  if (!profile) notFound();

  const agentCanBeUsed =
    profile.metadataStatus === "valid" && profile.active !== false;

  return (
    <StartTaskFlow
      agent={{
        agentId: profile.agentId,
        chainId: profile.chainId,
        name: formatAgentName(profile.name, profile.agentId),
      }}
      externalServices={
        agentCanBeUsed
          ? externalAgentServices(profile.services).map((service) => ({
              href: service.href,
              label: formatServiceType(service.serviceType),
            }))
          : []
      }
      services={agentCanBeUsed ? currentActivationServices(profile.services) : []}
    />
  );
}
