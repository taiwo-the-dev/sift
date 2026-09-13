import { NextRequest, NextResponse } from "next/server";

import { isActivationEvidenceCurrent, parseActivationStatus } from "@/features/activation/model";
import { sendA2aTask } from "@/features/activation/protocol";
import { ActivationRemoteError } from "@/features/activation/remote";
import { a2aTaskSchema } from "@/features/activation/schema";
import { createActivationRepository } from "@/lib/db/activation-repository";
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
    return NextResponse.json({ error: "Cross-site task requests are not allowed." }, { status: 403 });
  }

  const rateLimit = checkApiRateLimit(request, {
    capacity: 12,
    namespace: "activation:a2a",
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const input = a2aTaskSchema.parse(await readBoundedJson(request, 4_096));
    const repository = createActivationRepository();
    const service = await repository.findService(input.serviceId);
    const identity = service
      ? await repository.findAgentIdentity(service.agent_db_id)
      : null;
    if (
      !service ||
      !identity ||
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
      agent: identity,
      endpoint: service.endpoint,
      maxBytes: 65_536,
      message: input.message,
      skillId: input.skillId,
      timeoutMs: 12_000,
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
      error instanceof ActivationRemoteError
        ? error.message
        : "Sift could not send this task. Check the details and try again.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
