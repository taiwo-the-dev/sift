import { NextRequest, NextResponse } from "next/server";
import { getAddress, type Hex } from "viem";

import { isUsableActivationEvidence, parseActivationStatus } from "@/features/activation/model";
import { callMcpTool, inspectMcpService } from "@/features/activation/protocol";
import { ActivationRemoteError } from "@/features/activation/remote";
import { mcpToolCallSchema } from "@/features/activation/schema";
import { getHiringPublicClient } from "@/lib/blockchain/hiring-client";
import { createActivationRepository } from "@/lib/db/activation-repository";
import {
  consumeMcpActionAuthorization,
  hashMcpToolArguments,
  loadMcpActionAuthorization,
} from "@/lib/db/mcp-action-authorization-repository";
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
    return NextResponse.json({ error: "Cross-site tool requests are not allowed." }, { status: 403 });
  }

  const rateLimit = checkApiRateLimit(request, {
    capacity: 12,
    namespace: "activation:mcp",
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const input = mcpToolCallSchema.parse(await readBoundedJson(request, 32_768));
    const repository = createActivationRepository();
    const service = await repository.findService(input.serviceId);
    const identity = service
      ? await repository.findAgentIdentity(service.agent_db_id)
      : null;
    if (
      !service ||
      !identity ||
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

    const inspection = await inspectMcpService(service.endpoint, {
      maxBytes: 65_536,
      timeoutMs: 12_000,
    });
    const selectedTool = inspection.tools.find(
      (candidate) => candidate.name === input.toolName,
    );
    if (!selectedTool) {
      return NextResponse.json(
        { error: "The selected tool is no longer published by this agent." },
        { status: 409 },
      );
    }

    if (!selectedTool.readOnly) {
      const authorization = input.authorization
        ? await loadMcpActionAuthorization(input.authorization.token)
        : null;
      let walletAddress: ReturnType<typeof getAddress> | null = null;
      try {
        walletAddress = input.authorization
          ? getAddress(input.authorization.walletAddress)
          : null;
      } catch {
        walletAddress = null;
      }

      if (
        !input.confirmedSideEffects ||
        !input.authorization ||
        !authorization ||
        !walletAddress ||
        authorization.serviceId !== input.serviceId ||
        authorization.toolName !== input.toolName ||
        authorization.agentId !== identity.agentId ||
        authorization.chainId !== identity.chainId ||
        authorization.walletAddress !== walletAddress ||
        authorization.argumentsHash !== hashMcpToolArguments(input.arguments)
      ) {
        return NextResponse.json(
          { error: "Approve this exact action with the connected wallet before continuing." },
          { status: 401 },
        );
      }

      const verified = await getHiringPublicClient(authorization.chainId).verifyMessage({
        address: authorization.walletAddress,
        message: authorization.message,
        signature: input.authorization.signature as Hex,
      });
      if (!verified) {
        return NextResponse.json(
          { error: "The one-time tool approval signature could not be verified." },
          { status: 401 },
        );
      }
      if (!(await consumeMcpActionAuthorization(authorization.id))) {
        return NextResponse.json(
          { error: "This tool approval expired or was already used." },
          { status: 409 },
        );
      }
    }

    const result = await callMcpTool({
      arguments: input.arguments,
      confirmedSideEffects: !selectedTool.readOnly,
      endpoint: service.endpoint,
      expectedChainId: identity.chainId,
      maxBytes: 65_536,
      timeoutMs: 12_000,
      toolName: input.toolName,
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
        : "Sift could not run this tool. Check the arguments and try again.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
