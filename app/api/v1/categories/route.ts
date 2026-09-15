import { discoveryCategories } from "@/features/discovery/model";
import {
  enforcePublicApiRateLimit,
  publicApiJson,
  publicApiOptions,
} from "@/lib/public-api/http";

export const runtime = "nodejs";

export function OPTIONS(): Response {
  return publicApiOptions();
}

export function GET(request: Request): Response {
  const rateLimit = enforcePublicApiRateLimit(request, "categories:list");
  if (rateLimit instanceof Response) return rateLimit;

  return publicApiJson(
    discoveryCategories.map((category) => ({
      description: category.description,
      id: category.slug,
      label: category.label,
    })),
    {},
    {
      cacheControl:
        "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
      rateLimit,
    },
  );
}
