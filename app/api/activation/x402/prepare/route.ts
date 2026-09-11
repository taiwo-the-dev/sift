import { NextRequest, NextResponse } from "next/server";

import { resolveCurrentX402Service } from "@/app/api/activation/x402/service";
import { ActivationRemoteError } from "@/features/activation/remote";
import { x402PrepareSchema } from "@/features/activation/schema";
import { prepareX402Payment } from "@/features/activation/x402-server";

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
    const input = x402PrepareSchema.parse(await request.json());
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
    const message =
      error instanceof ActivationRemoteError || error instanceof TypeError
        ? error.message
        : "Sift could not refresh this payment request.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
