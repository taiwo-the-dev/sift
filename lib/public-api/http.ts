import "server-only";

import {
  checkApiRateLimit,
  type RateLimitDecision,
} from "@/lib/security/api-request";

export const PUBLIC_API_VERSION = "v1";

const corsHeaders = {
  "access-control-allow-headers": "Accept, Content-Type",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-origin": "*",
  "access-control-max-age": "86400",
} as const;

type PublicApiResponseOptions = Readonly<{
  cacheControl?: string;
  rateLimit?: RateLimitDecision;
  status?: number;
}>;

function responseHeaders(options: PublicApiResponseOptions): HeadersInit {
  return {
    ...corsHeaders,
    "cache-control": options.cacheControl ?? "no-store",
    ...(options.rateLimit
      ? {
          "rate-limit-limit": String(options.rateLimit.limit),
          "rate-limit-remaining": String(options.rateLimit.remaining),
        }
      : {}),
  };
}

export function publicApiJson(
  data: unknown,
  meta: Readonly<Record<string, unknown>> = {},
  options: PublicApiResponseOptions = {},
): Response {
  return Response.json(
    {
      data,
      meta: {
        apiVersion: PUBLIC_API_VERSION,
        generatedAt: new Date().toISOString(),
        ...meta,
      },
    },
    {
      headers: responseHeaders(options),
      status: options.status ?? 200,
    },
  );
}

export function publicApiError(
  code: string,
  message: string,
  status: number,
  options: PublicApiResponseOptions = {},
): Response {
  return Response.json(
    {
      error: { code, message },
      meta: {
        apiVersion: PUBLIC_API_VERSION,
        generatedAt: new Date().toISOString(),
      },
    },
    {
      headers: responseHeaders(options),
      status,
    },
  );
}

export function enforcePublicApiRateLimit(
  request: Request,
  namespace: string,
): RateLimitDecision | Response {
  const decision = checkApiRateLimit(request, {
    capacity: 60,
    namespace: `public-api:${namespace}`,
    windowMs: 60_000,
  });

  return decision.allowed
    ? decision
    : publicApiError(
        "rate_limit_exceeded",
        "Too many requests. Wait briefly and try again.",
        429,
        { rateLimit: decision },
      );
}

export function publicApiOptions(): Response {
  return new Response(null, {
    headers: {
      ...corsHeaders,
      "cache-control": "public, max-age=86400",
    },
    status: 204,
  });
}
