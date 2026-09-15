import { toPublicAgentSummary } from "@/features/public-api/presentation";
import {
  parsePublicAgentQuery,
  PublicApiQueryError,
} from "@/features/public-api/query";
import { createDiscoveryRepository } from "@/lib/db/discovery-repository";
import {
  enforcePublicApiRateLimit,
  publicApiError,
  publicApiJson,
  publicApiOptions,
} from "@/lib/public-api/http";

export const runtime = "nodejs";

export function OPTIONS(): Response {
  return publicApiOptions();
}

export async function GET(request: Request): Promise<Response> {
  const rateLimit = enforcePublicApiRateLimit(request, "agents:list");
  if (rateLimit instanceof Response) return rateLimit;

  try {
    const query = parsePublicAgentQuery(new URL(request.url));
    const result = await createDiscoveryRepository().search(query);

    return publicApiJson(
      result.agents.map(toPublicAgentSummary),
      {
        filters: {
          availability: query.taskAvailability,
          categories: query.categories,
          chainId: query.networkChainIds[0],
          health: query.healthStatuses,
          profileStatus: query.metadataStatuses,
          query: query.query || null,
          rating: query.scoreBands,
          registered: query.registrationPeriod,
          sort: query.sort,
        },
        pagination: {
          hasNextPage: result.hasNextPage,
          limit: result.pageSize,
          page: result.page,
        },
      },
      {
        cacheControl:
          "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
        rateLimit,
      },
    );
  } catch (error) {
    if (error instanceof PublicApiQueryError) {
      return publicApiError("invalid_query", error.message, 400, { rateLimit });
    }

    console.error("[public-api] agent search failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return publicApiError(
      "catalogue_unavailable",
      "The agent catalogue is temporarily unavailable.",
      503,
      { rateLimit },
    );
  }
}
