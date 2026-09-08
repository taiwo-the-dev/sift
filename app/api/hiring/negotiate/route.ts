import { getAddress } from "viem";
import { z } from "zod";

import { parseAgentProfileIdentity } from "@/features/agents/route";
import { getAgentProfile } from "@/features/agents/service";
import { resolveHiringCompatibility } from "@/features/hiring/compatibility";
import {
  getErc8183Deployment,
  isHiringChainId,
} from "@/features/hiring/protocol";
import {
  HiringQuoteError,
  parseAgentCommerceStatus,
  validateHiringQuote,
} from "@/features/hiring/quote";
import { fetchSafeAgentJson } from "@/features/hiring/remote";
import { parseHiringMission } from "@/features/hiring/validation";
import {
  getHiringPublicClient,
  verifyErc8183Runtime,
} from "@/lib/blockchain/hiring-client";

export const runtime = "nodejs";

const requestSchema = z.object({
  agentId: z.string(),
  chainId: z.number().int().positive(),
  deliverables: z.string(),
  durationSeconds: z.number(),
  maxSpend: z.string(),
  mission: z.string(),
  qualityStandards: z.string(),
});

function json(
  body: unknown,
  status = 200,
): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function requestIsAcceptable(request: Request): boolean {
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  const contentType = request.headers.get("content-type") ?? "";
  const fetchSite = request.headers.get("sec-fetch-site");
  const origin = request.headers.get("origin");
  const expectedOrigin = new URL(request.url).origin;

  return (
    contentLength <= 16_384 &&
    contentType.toLowerCase().startsWith("application/json") &&
    fetchSite !== "cross-site" &&
    (!origin || origin === expectedOrigin)
  );
}

export async function POST(request: Request): Promise<Response> {
  if (!requestIsAcceptable(request)) {
    return json({ error: "Invalid quote request." }, 400);
  }

  try {
    const raw = requestSchema.parse(await request.json());
    const identity = parseAgentProfileIdentity(
      String(raw.chainId),
      raw.agentId,
    );

    if (!identity || !isHiringChainId(identity.chainId)) {
      return json({ error: "Invalid agent ID or network." }, 400);
    }

    const deployment = getErc8183Deployment(identity.chainId);
    const mission = parseHiringMission(raw, identity.chainId);
    const profile = await getAgentProfile(identity.chainId, identity.agentId);

    if (!profile || !profile.ownerAddress) {
      return json({ error: "This agent is not available." }, 404);
    }

    const compatibility = resolveHiringCompatibility(profile);

    if (!compatibility) {
      return json(
        {
          error:
            `This agent does not provide a safe ERC-8183 price service on ${deployment.networkName}.`,
        },
        409,
      );
    }

    const publicClient = getHiringPublicClient(identity.chainId);
    const runtimeState = await verifyErc8183Runtime(
      identity.chainId,
      publicClient,
    );
    const statusDocument = await fetchSafeAgentJson(compatibility.statusUrl, {
      method: "GET",
    });
    const status = parseAgentCommerceStatus(
      statusDocument,
      getAddress(profile.ownerAddress),
      identity.chainId,
    );
    const envelope = await fetchSafeAgentJson(compatibility.negotiateUrl, {
      body: JSON.stringify({
        task_description: mission.mission,
        terms: {
          deliverables: mission.deliverables,
          quality_standards: mission.qualityStandards,
        },
      }),
      method: "POST",
      timeoutMs: 12_000,
    });
    const quote = await validateHiringQuote({
      chainId: identity.chainId,
      disputeWindowSeconds: runtimeState.disputeWindowSeconds,
      envelope,
      mission,
      now: runtimeState.blockTimestamp * 1_000,
      platformFeeBasisPoints: runtimeState.platformFeeBasisPoints,
      provider: status.agentAddress,
      publicClient,
    });

    if (BigInt(quote.budgetBaseUnits) < status.servicePrice) {
      throw new HiringQuoteError(
        "invalid-quote",
        "The signed price quote is below the price listed by the agent.",
      );
    }

    return json({ quote });
  } catch (error) {
    if (error instanceof HiringQuoteError) {
      const status =
        error.code === "quote-over-budget" ||
        error.code === "unsupported-agent-service"
          ? 409
          : error.code === "protocol-unavailable"
            ? 503
            : 502;
      return json({ code: error.code, error: error.message }, status);
    }

    if (error instanceof z.ZodError) {
      return json(
        {
          error:
            error.issues[0]?.message ?? "Review the task fields and try again.",
        },
        400,
      );
    }

    console.error("[hiring] quote request failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return json(
      { error: "Sift could not request a verified agent quote right now." },
      500,
    );
  }
}
