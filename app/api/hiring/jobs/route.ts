import { getAddress, type Address } from "viem";
import { z } from "zod";

import { parseAgentProfileIdentity } from "@/features/agents/route";
import { getAgentProfile } from "@/features/agents/service";
import { resolveHiringCompatibility } from "@/features/hiring/compatibility";
import {
  isHiringIdempotencyKey,
  isHiringResumeToken,
} from "@/features/hiring/idempotency";
import { HiringQuoteError, validateHiringQuote } from "@/features/hiring/quote";
import { parseHiringMission } from "@/features/hiring/validation";
import {
  getHiringPublicClient,
  verifyErc8183Runtime,
} from "@/lib/blockchain/hiring-client";
import {
  createHiringIntent,
  HiringConflictError,
} from "@/lib/db/hiring-repository";

export const runtime = "nodejs";

const requestSchema = z.object({
  agentId: z.string(),
  chainId: z.number().int().positive(),
  deliverables: z.string(),
  durationSeconds: z.number(),
  idempotencyKey: z.string(),
  maxSpend: z.string(),
  mission: z.string(),
  qualityStandards: z.string(),
  resumeToken: z.string(),
  signedEnvelope: z.record(z.string(), z.unknown()),
  walletAddress: z.string(),
});

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");

  if (
    contentLength > 24_576 ||
    fetchSite === "cross-site" ||
    (origin && origin !== new URL(request.url).origin) ||
    !request.headers.get("content-type")?.startsWith("application/json")
  ) {
    return json({ error: "Invalid hiring intent request." }, 400);
  }

  try {
    const raw = requestSchema.parse(await request.json());
    const identity = parseAgentProfileIdentity(
      String(raw.chainId),
      raw.agentId,
    );

    if (
      !identity ||
      !isHiringIdempotencyKey(raw.idempotencyKey) ||
      !isHiringResumeToken(raw.resumeToken)
    ) {
      return json({ error: "Invalid hiring intent identifiers." }, 400);
    }

    let walletAddress: Address;

    try {
      walletAddress = getAddress(raw.walletAddress);
    } catch {
      return json({ error: "Connect a valid wallet before continuing." }, 400);
    }

    const mission = parseHiringMission(raw);
    const profile = await getAgentProfile(identity.chainId, identity.agentId);

    if (
      !profile?.ownerAddress ||
      !resolveHiringCompatibility(profile)
    ) {
      return json({ error: "The selected agent is not currently hireable." }, 409);
    }

    const publicClient = getHiringPublicClient();
    const runtimeState = await verifyErc8183Runtime(publicClient);
    const quote = await validateHiringQuote({
      disputeWindowSeconds: runtimeState.disputeWindowSeconds,
      envelope: raw.signedEnvelope,
      mission,
      now: runtimeState.blockTimestamp * 1_000,
      platformFeeBasisPoints: runtimeState.platformFeeBasisPoints,
      provider: getAddress(profile.ownerAddress),
      publicClient,
    });
    const result = await createHiringIntent({
      agentId: identity.agentId,
      chainId: identity.chainId,
      deliverables: mission.deliverables,
      durationSeconds: mission.durationSeconds,
      idempotencyKey: raw.idempotencyKey,
      maxSpend: mission.maxSpend,
      mission: mission.mission,
      qualityStandards: mission.qualityStandards,
      quote,
      resumeToken: raw.resumeToken,
      walletAddress,
    });

    return json(
      { created: result.created, intent: result.snapshot },
      result.created ? 201 : 200,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json(
        { error: error.issues[0]?.message ?? "Invalid hiring intent." },
        400,
      );
    }

    if (error instanceof HiringQuoteError) {
      return json({ code: error.code, error: error.message }, 409);
    }

    if (error instanceof HiringConflictError) {
      return json({ error: error.message }, 409);
    }

    console.error("[hiring] intent creation failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ error: "Sift could not save the hiring intent." }, 500);
  }
}
