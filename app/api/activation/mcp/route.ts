import { NextRequest, NextResponse } from "next/server";

import { isUsableActivationEvidence, parseActivationStatus } from "@/features/activation/model";
import { callMcpTool } from "@/features/activation/protocol";
import { ActivationRemoteError } from "@/features/activation/remote";
import { mcpToolCallSchema } from "@/features/activation/schema";
import { createActivationRepository } from "@/lib/db/activation-repository";

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const site = request.headers.get("sec-fetch-site");
  return site !== "cross-site" && origin === request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Cross-site tool requests are not allowed." }, { status: 403 });
  }

  try {
    const input = mcpToolCallSchema.parse(await request.json());
    const repository = createActivationRepository();
    const service = await repository.findService(input.serviceId);
    if (
      !service ||
      service.activation_method !== "mcp" ||
      !service.endpoint ||
      !(await repository.isServiceAgentEligible(service.agent_db_id)) ||
      !isUsableActivationEvidence({
        checkedAt: service.availability_checked_at,
        failureCode: service.availability_failure_code,
        lastSuccessAt: service.availability_last_success_at,
        method: "mcp",
        status: parseActivationStatus(service.availability_status),
        summary: service.capability_summary,
      })
    ) {
      return NextResponse.json(
        { error: "This MCP service does not have a current successful check." },
        { status: 409 },
      );
    }

    const result = await callMcpTool({
      arguments: input.arguments,
      confirmedSideEffects: input.confirmedSideEffects,
      endpoint: service.endpoint,
      expectedChainId:
        (await repository.findAgentIdentity(service.agent_db_id))?.chainId ?? 0,
      maxBytes: 65_536,
      timeoutMs: 12_000,
      toolName: input.toolName,
    });
    return NextResponse.json(
      { result },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    const message =
      error instanceof ActivationRemoteError
        ? error.message
        : "Sift could not run this tool. Check the arguments and try again.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
