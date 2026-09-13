import { NextRequest, NextResponse } from "next/server";

import { resolveCurrentX402Service } from "@/app/api/activation/x402/service";
import { ActivationRemoteError } from "@/features/activation/remote";
import { x402PrepareSchema } from "@/features/activation/schema";
import { prepareX402Payment } from "@/features/activation/x402-server";
import {
  ApiRequestError,
  checkApiRateLimit,
  isSameOriginRequest,
  rateLimitResponse,
  readBoundedJson,
} from "@/lib/security/api-request";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Cross-site payment requests are not allowed." },
      { status: 403 },
    );
  }

  const rateLimit = checkApiRateLimit(request, {
    capacity: 10,
    namespace: "activation:x402:prepare",
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const input = x402PrepareSchema.parse(await readBoundedJson(request, 4_096));
    const service = await resolveCurrentX402Service(input.serviceId);
    if (!service) {
      return NextResponse.json(
        { error: "This payment service does not have a current successful check." },
        { status: 409 },
      );
    }
    const result = await prepareX402Payment({
      ...service,
      preference: input.preference,
      walletAddress: input.walletAddress,
    });
    return NextResponse.json(
      { result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof ActivationRemoteError || error instanceof TypeError
        ? error.message
        : "Sift could not refresh this payment request.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
