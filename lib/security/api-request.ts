import "server-only";

import { createHash } from "node:crypto";

export type RateLimitPolicy = Readonly<{
  capacity: number;
  namespace: string;
  windowMs: number;
}>;

export type RateLimitDecision = Readonly<{
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
}>;

type Bucket = {
  lastRefillAt: number;
  tokens: number;
};

const MAXIMUM_BUCKETS = 5_000;
const CLEANUP_INTERVAL = 128;

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 413 | 415,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export class MemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private checks = 0;

  consume(
    identifier: string,
    policy: RateLimitPolicy,
    now = Date.now(),
  ): RateLimitDecision {
    if (
      !Number.isInteger(policy.capacity) ||
      policy.capacity < 1 ||
      !Number.isFinite(policy.windowMs) ||
      policy.windowMs < 1
    ) {
      throw new TypeError("Rate-limit policies must use positive bounds.");
    }

    this.checks += 1;
    if (this.checks % CLEANUP_INTERVAL === 0) {
      this.removeIdleBuckets(now);
    }

    const key = `${policy.namespace}:${identifier}`;
    const refillPerMillisecond = policy.capacity / policy.windowMs;
    const existing = this.buckets.get(key);
    const elapsed = existing ? Math.max(0, now - existing.lastRefillAt) : 0;
    const available = existing
      ? Math.min(
          policy.capacity,
          existing.tokens + elapsed * refillPerMillisecond,
        )
      : policy.capacity;
    const allowed = available >= 1;
    const tokens = allowed ? available - 1 : available;

    this.buckets.set(key, { lastRefillAt: now, tokens });
    this.enforceBucketBound();

    return {
      allowed,
      limit: policy.capacity,
      remaining: Math.floor(tokens),
      retryAfterSeconds: allowed
        ? 0
        : Math.max(
            1,
            Math.ceil((1 - tokens) / refillPerMillisecond / 1_000),
          ),
    };
  }

  private enforceBucketBound(): void {
    while (this.buckets.size > MAXIMUM_BUCKETS) {
      const oldestKey = this.buckets.keys().next().value as string | undefined;
      if (!oldestKey) return;
      this.buckets.delete(oldestKey);
    }
  }

  private removeIdleBuckets(now: number): void {
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefillAt > 60 * 60 * 1_000) {
        this.buckets.delete(key);
      }
    }
  }
}

const globalRateLimitState = globalThis as typeof globalThis & {
  __siftApiRateLimiter?: MemoryRateLimiter;
};

const sharedRateLimiter =
  globalRateLimitState.__siftApiRateLimiter ?? new MemoryRateLimiter();
globalRateLimitState.__siftApiRateLimiter = sharedRateLimiter;

function hashIdentifier(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("base64url");
}

function requestIdentifier(request: Request): string {
  const forwarded =
    request.headers.get("x-vercel-forwarded-for") ??
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unidentified";
  const address = forwarded.split(",", 1)[0]?.trim().slice(0, 128);

  return hashIdentifier(address || "unidentified");
}

export function checkApiRateLimit(
  request: Request,
  policy: RateLimitPolicy,
): RateLimitDecision {
  return sharedRateLimiter.consume(requestIdentifier(request), policy);
}

export function rateLimitResponse(
  decision: RateLimitDecision,
  message = "Too many requests. Wait briefly and try again.",
): Response {
  return Response.json(
    { error: message },
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "rate-limit-limit": String(decision.limit),
        "rate-limit-remaining": String(decision.remaining),
        "retry-after": String(decision.retryAfterSeconds),
      },
    },
  );
}

export function isSameOriginRequest(
  request: Request,
  options: Readonly<{ allowMissingOrigin?: boolean }> = {},
): boolean {
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite === "cross-site") return false;
  if (!origin) return options.allowMissingOrigin === true;

  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

async function readBoundedText(request: Request, maximumBytes: number) {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0) {
      throw new ApiRequestError("Invalid request size.", 400);
    }
    if (parsedLength > maximumBytes) {
      throw new ApiRequestError("The request is too large.", 413);
    }
  }

  if (!request.body) {
    throw new ApiRequestError("A JSON request body is required.", 400);
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let body = "";
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      receivedBytes += value.byteLength;
      if (receivedBytes > maximumBytes) {
        await reader.cancel();
        throw new ApiRequestError("The request is too large.", 413);
      }

      body += decoder.decode(value, { stream: true });
    }

    body += decoder.decode();
    return body;
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError("The request body is not valid UTF-8.", 400);
  } finally {
    reader.releaseLock();
  }
}

export async function readBoundedJson(
  request: Request,
  maximumBytes: number,
): Promise<unknown> {
  if (!Number.isSafeInteger(maximumBytes) || maximumBytes < 1) {
    throw new TypeError("The JSON request limit must be a positive integer.");
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new ApiRequestError("A JSON request body is required.", 415);
  }

  const body = await readBoundedText(request, maximumBytes);

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new ApiRequestError("The request body is not valid JSON.", 400);
  }
}
