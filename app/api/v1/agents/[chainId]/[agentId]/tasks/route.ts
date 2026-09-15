import { parseAgentProfileIdentity } from "@/features/agents/route";
import { getAgentProfile } from "@/features/agents/service";
import { toPublicAgentTasks } from "@/features/public-api/presentation";
import {
  enforcePublicApiRateLimit,
  publicApiError,
  publicApiJson,
  publicApiOptions,
} from "@/lib/public-api/http";

export const runtime = "nodejs";

interface TasksApiContext {
  params: Promise<Readonly<{ agentId: string; chainId: string }>>;
}

export function OPTIONS(): Response {
  return publicApiOptions();
}

export async function GET(
  request: Request,
  context: TasksApiContext,
): Promise<Response> {
  const rateLimit = enforcePublicApiRateLimit(request, "agents:tasks");
  if (rateLimit instanceof Response) return rateLimit;

  const { agentId, chainId } = await context.params;
  const identity = parseAgentProfileIdentity(chainId, agentId);

  if (!identity) {
    return publicApiError(
      "invalid_agent_identity",
      "Use BSC chain ID 56 or 97 and a valid numeric ERC-8004 agent ID.",
      400,
      { rateLimit },
    );
  }

  try {
    const profile = await getAgentProfile(identity.chainId, identity.agentId);

    return profile
      ? publicApiJson(toPublicAgentTasks(profile), {}, {
          cacheControl:
            "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
          rateLimit,
        })
      : publicApiError(
          "agent_not_found",
          "No indexed agent matches this network and agent ID.",
          404,
          { rateLimit },
        );
  } catch (error) {
    console.error("[public-api] agent tasks failed", {
      agentId: identity.agentId,
      chainId: identity.chainId,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return publicApiError(
      "task_history_unavailable",
      "The agent task history is temporarily unavailable.",
      503,
      { rateLimit },
    );
  }
}
