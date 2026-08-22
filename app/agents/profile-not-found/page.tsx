import type { Metadata } from "next";

import AgentProfileNotFound from "@/app/agents/[chainId]/[agentId]/not-found";

export const metadata: Metadata = {
  title: "Agent not found",
  robots: { index: false, follow: false },
};

export default AgentProfileNotFound;
