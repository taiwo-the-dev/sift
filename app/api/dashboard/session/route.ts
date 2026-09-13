import { cookies } from "next/headers";
import { getAddress, isAddress, type Hex } from "viem";
import { z } from "zod";

import {
  DASHBOARD_CHALLENGE_COOKIE,
  DASHBOARD_CHALLENGE_TTL_SECONDS,
  DASHBOARD_SESSION_COOKIE,
  DASHBOARD_SESSION_TTL_SECONDS,
} from "@/features/dashboard/session";
import { isHiringChainId } from "@/features/hiring/protocol";
import { getHiringPublicClient } from "@/lib/blockchain/hiring-client";
import {
  createDashboardChallenge,
  deleteDashboardSession,
  exchangeDashboardChallenge,
  loadDashboardChallenge,
} from "@/lib/db/dashboard-session-repository";
import {
  ApiRequestError,
  checkApiRateLimit,
  isSameOriginRequest,
  rateLimitResponse,
  readBoundedJson,
} from "@/lib/security/api-request";

export const runtime = "nodejs";

const signatureSchema = z.object({
  signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
});

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function cookieOptions(request: Request, maxAge: number) {
  return {
    httpOnly: true,
    maxAge,
    path: "/api/dashboard",
    sameSite: "strict" as const,
    secure: new URL(request.url).protocol === "https:",
  };
}

function clearCookie(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  request: Request,
  name: string,
): void {
  cookieStore.set(name, "", cookieOptions(request, 0));
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const rawAddress = url.searchParams.get("address")?.trim();
  const rawChainId = Number(url.searchParams.get("chainId"));

  if (
    !isSameOriginRequest(request, { allowMissingOrigin: true }) ||
    !rawAddress ||
    !isAddress(rawAddress) ||
    !isHiringChainId(rawChainId)
  ) {
    return json({ error: "Connect a valid wallet before authorizing the dashboard." }, 400);
  }

  const rateLimit = checkApiRateLimit(request, {
    capacity: 6,
    namespace: "dashboard:challenge",
    windowMs: 5 * 60_000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const stored = await createDashboardChallenge({
      chainId: rawChainId,
      origin: url.origin,
      walletAddress: getAddress(rawAddress),
    });
    (await cookies()).set(
      DASHBOARD_CHALLENGE_COOKIE,
      stored.token,
      cookieOptions(request, DASHBOARD_CHALLENGE_TTL_SECONDS),
    );
    return json({ challenge: stored.challenge });
  } catch (error) {
    console.error("[dashboard] challenge creation failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ error: "Sift could not start wallet verification." }, 500);
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return json({ error: "Invalid dashboard authorization request." }, 400);
  }

  const rateLimit = checkApiRateLimit(request, {
    capacity: 8,
    namespace: "dashboard:verify",
    windowMs: 5 * 60_000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const { signature } = signatureSchema.parse(
      await readBoundedJson(request, 2_048),
    );
    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(DASHBOARD_CHALLENGE_COOKIE)?.value;
    const challenge = challengeToken
      ? await loadDashboardChallenge(challengeToken)
      : null;

    if (!challenge) {
      return json({ error: "The wallet verification request expired. Try again." }, 401);
    }

    const verified = await getHiringPublicClient(challenge.chainId).verifyMessage({
      address: challenge.walletAddress,
      message: challenge.message,
      signature: signature as Hex,
    });
    if (!verified) {
      return json({ error: "The wallet signature could not be verified." }, 401);
    }

    const session = await exchangeDashboardChallenge({
      challengeId: challenge.id,
      walletAddress: challenge.walletAddress,
    });
    if (!session) {
      return json({ error: "The wallet verification request was already used." }, 409);
    }

    clearCookie(cookieStore, request, DASHBOARD_CHALLENGE_COOKIE);
    cookieStore.set(
      DASHBOARD_SESSION_COOKIE,
      session.token,
      cookieOptions(request, DASHBOARD_SESSION_TTL_SECONDS),
    );
    return json({ session: session.identity });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return json({ error: error.message }, error.status);
    }
    if (error instanceof z.ZodError) {
      return json({ error: "The wallet returned an invalid signature." }, 400);
    }
    console.error("[dashboard] wallet verification failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ error: "Sift could not verify dashboard access." }, 500);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return json({ error: "Invalid dashboard session request." }, 400);
  }

  const rateLimit = checkApiRateLimit(request, {
    capacity: 12,
    namespace: "dashboard:delete",
    windowMs: 5 * 60_000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const cookieStore = await cookies();
    await deleteDashboardSession(
      cookieStore.get(DASHBOARD_SESSION_COOKIE)?.value ?? null,
    );
    clearCookie(cookieStore, request, DASHBOARD_CHALLENGE_COOKIE);
    clearCookie(cookieStore, request, DASHBOARD_SESSION_COOKIE);
    return json({ cleared: true });
  } catch (error) {
    console.error("[dashboard] session deletion failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ error: "Sift could not clear dashboard access." }, 500);
  }
}
