import "server-only";

import { cache } from "react";

import type { AgentProfile } from "@/features/agents/model";
import { createAgentProfileRepository } from "@/lib/db/agent-profile-repository";

export const getAgentProfile = cache(
  async (chainId: number, agentId: string): Promise<AgentProfile | null> =>
    createAgentProfileRepository().findByIdentity(chainId, agentId),
);
