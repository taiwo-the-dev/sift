import { cookies } from "next/headers";
import { getAddress, isAddress, type Hex } from "viem";
import { z } from "zod";

import {
  DASHBOARD_CHALLENGE_COOKIE,
  DASHBOARD_CHALLENGE_TTL_SECONDS,
  DASHBOARD_SESSION_COOKIE,
  DASHBOARD_SESSION_TTL_SECONDS,
} from "@/features/dashboard/session";
import { getHiringPublicClient } from "@/lib/blockchain/hiring-client";
import {
  createDashboardChallenge,
  deleteDashboardSession,
  exchangeDashboardChallenge,
  loadDashboardChallenge,
} from "@/lib/db/dashboard-session-repository";

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

function safeSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return (
    request.headers.get("sec-fetch-site") !== "cross-site" &&
    (!origin || origin === new URL(request.url).origin)
  );
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

  if (!safeSameOrigin(request) || !rawAddress || !isAddress(rawAddress)) {
    return json({ error: "Connect a valid wallet before authorizing the dashboard." }, 400);
  }

  try {
    const stored = await createDashboardChallenge({
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
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (
    !safeSameOrigin(request) ||
    contentLength > 2_048 ||
    !request.headers.get("content-type")?.startsWith("application/json")
  ) {
    return json({ error: "Invalid dashboard authorization request." }, 400);
  }

  try {
    const { signature } = signatureSchema.parse(await request.json());
    const cookieStore = await cookies();
    const challengeToken = cookieStore.get(DASHBOARD_CHALLENGE_COOKIE)?.value;
    const challenge = challengeToken
      ? await loadDashboardChallenge(challengeToken)
      : null;

    if (!challenge) {
      return json({ error: "The wallet verification request expired. Try again." }, 401);
    }

    const verified = await getHiringPublicClient().verifyMessage({
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
  if (!safeSameOrigin(request)) {
    return json({ error: "Invalid dashboard session request." }, 400);
  }

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
