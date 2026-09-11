import { NextRequest, NextResponse } from "next/server";

import { resolveCurrentX402Service } from "@/app/api/activation/x402/service";
import { executeX402Service } from "@/features/activation/protocol";
import { ActivationRemoteError } from "@/features/activation/remote";
import { x402ExecuteSchema } from "@/features/activation/schema";

const MAX_REQUEST_BYTES = 32_768;

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  return site !== "cross-site" && origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json(
      { error: "Cross-site payment requests are not allowed." },
      { status: 403 },
    );
  }

  try {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (declaredLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: "The signed payment request is too large." },
        { status: 413 },
      );
    }
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
      return NextResponse.json(
        { error: "The signed payment request is too large." },
        { status: 413 },
      );
    }
    const input = x402ExecuteSchema.parse(JSON.parse(body) as unknown);
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
