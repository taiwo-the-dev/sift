import { parseAgentProfileIdentity } from "@/features/agents/route";
import { getAgentProfile } from "@/features/agents/service";
import { toPublicAgentScore } from "@/features/public-api/presentation";
import {
  enforcePublicApiRateLimit,
  publicApiError,
  publicApiJson,
  publicApiOptions,
} from "@/lib/public-api/http";

export const runtime = "nodejs";

interface ScoreApiContext {
  params: Promise<Readonly<{ agentId: string; chainId: string }>>;
}

export function OPTIONS(): Response {
  return publicApiOptions();
}

export async function GET(
  request: Request,
  context: ScoreApiContext,
): Promise<Response> {
  const rateLimit = enforcePublicApiRateLimit(request, "agents:score");
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
      ? publicApiJson(toPublicAgentScore(profile), {
          agentId: profile.agentId,
          chainId: profile.chainId,
        }, {
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
    console.error("[public-api] agent score failed", {
      agentId: identity.agentId,
      chainId: identity.chainId,
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return publicApiError(
      "score_unavailable",
      "The agent score is temporarily unavailable.",
      503,
      { rateLimit },
    );
  }
}
