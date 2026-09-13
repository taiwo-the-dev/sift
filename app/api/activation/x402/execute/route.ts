import { NextRequest, NextResponse } from "next/server";

import { resolveCurrentX402Service } from "@/app/api/activation/x402/service";
import { executeX402Service } from "@/features/activation/protocol";
import { ActivationRemoteError } from "@/features/activation/remote";
import { x402ExecuteSchema } from "@/features/activation/schema";
import {
  ApiRequestError,
  checkApiRateLimit,
  isSameOriginRequest,
  rateLimitResponse,
  readBoundedJson,
} from "@/lib/security/api-request";

const MAX_REQUEST_BYTES = 32_768;

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json(
      { error: "Cross-site payment requests are not allowed." },
      { status: 403 },
    );
  }

  const rateLimit = checkApiRateLimit(request, {
    capacity: 6,
    namespace: "activation:x402:execute",
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const input = x402ExecuteSchema.parse(
      await readBoundedJson(request, MAX_REQUEST_BYTES),
    );
    const service = await resolveCurrentX402Service(input.serviceId);
    if (!service) {
      return NextResponse.json(
        { error: "This payment service does not have a current successful check." },
        { status: 409 },
      );
    }
    const result = await executeX402Service({
      ...service,
      maxBytes: 65_536,
      payer: input.walletAddress,
      paymentPayload: input.paymentPayload,
      timeoutMs: 20_000,
    });
    return NextResponse.json(
      { result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const indeterminate =
      error instanceof ActivationRemoteError && error.code === "timeout";
    const message = indeterminate
      ? "The provider timed out after wallet approval. Do not sign again yet; check your token activity before retrying."
      : error instanceof ActivationRemoteError || error instanceof TypeError
        ? error.message
        : "Sift could not complete this paid request.";
    return NextResponse.json(
      { error: message, indeterminate },
      { status: indeterminate ? 504 : 422 },
    );
  }
}
