import { createCatalogueStatusRepository } from "@/lib/db/catalogue-status-repository";
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
  const rateLimit = enforcePublicApiRateLimit(request, "status:read");
  if (rateLimit instanceof Response) return rateLimit;

  try {
    const networks = await createCatalogueStatusRepository().list();

    return publicApiJson(
      networks.map((network) => ({
        agentCount: network.agentCount,
        agentCountIsEstimate: network.agentCountIsEstimate,
        chainId: network.chainId,
        checkpoint: network.checkpoint,
        confirmedHead: network.confirmedHead,
        isStale: network.isStale,
        label: network.label,
        lastUpdatedAt: network.checkpointUpdatedAt,
        phase: network.phase,
        registryAddress: network.registryAddress,
      })),
      {},
      {
        cacheControl:
          "public, max-age=30, s-maxage=60, stale-while-revalidate=180",
        rateLimit,
      },
    );
  } catch (error) {
    console.error("[public-api] catalogue status failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return publicApiError(
      "status_unavailable",
      "Catalogue status is temporarily unavailable.",
      503,
      { rateLimit },
    );
  }
}
