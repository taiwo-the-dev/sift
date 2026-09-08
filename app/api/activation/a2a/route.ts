import { NextRequest, NextResponse } from "next/server";

import { isActivationEvidenceCurrent, parseActivationStatus } from "@/features/activation/model";
import { sendA2aTask } from "@/features/activation/protocol";
import { ActivationRemoteError } from "@/features/activation/remote";
import { a2aTaskSchema } from "@/features/activation/schema";
import { createActivationRepository } from "@/lib/db/activation-repository";

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  return site !== "cross-site" && origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-site task requests are not allowed." }, { status: 403 });
  }

  try {
    const input = a2aTaskSchema.parse(await request.json());
    const repository = createActivationRepository();
    const service = await repository.findService(input.serviceId);
    if (
      !service ||
      service.activation_method !== "a2a" ||
      !service.endpoint ||
      !(await repository.isServiceAgentEligible(service.agent_db_id)) ||
      !isActivationEvidenceCurrent({
        lastSuccessAt: service.availability_last_success_at,
        status: parseActivationStatus(service.availability_status),
      })
    ) {
      return NextResponse.json(
        { error: "This A2A service does not have a current successful check." },
        { status: 409 },
      );
    }

    const result = await sendA2aTask({
      endpoint: service.endpoint,
      maxBytes: 65_536,
      message: input.message,
      timeoutMs: 12_000,
    });
    return NextResponse.json(
      { result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof ActivationRemoteError
        ? error.message
        : "Sift could not send this task. Check the details and try again.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
