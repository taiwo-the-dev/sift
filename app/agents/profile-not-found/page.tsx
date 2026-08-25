import type { Metadata } from "next";

import AgentProfileNotFound from "@/app/agents/[chainId]/[agentId]/not-found";
import { createPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = createPageMetadata({
  description: "The requested indexed ERC-8004 agent profile could not be resolved.",
  noIndex: true,
  path: "/agents/profile-not-found",
  title: "Agent not found",
});

export default AgentProfileNotFound;
