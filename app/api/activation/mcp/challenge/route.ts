import { getAddress } from "viem";
import { z } from "zod";

import { isUsableActivationEvidence, parseActivationStatus } from "@/features/activation/model";
import { inspectMcpService } from "@/features/activation/protocol";
import { ActivationRemoteError } from "@/features/activation/remote";
import { mcpActionChallengeSchema } from "@/features/activation/schema";
import { isHiringChainId } from "@/features/hiring/protocol";
import { createActivationRepository } from "@/lib/db/activation-repository";
import { createMcpActionAuthorization } from "@/lib/db/mcp-action-authorization-repository";
import {
  ApiRequestError,
  checkApiRateLimit,
  isSameOriginRequest,
  rateLimitResponse,
  readBoundedJson,
} from "@/lib/security/api-request";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Cross-site tool requests are not allowed." }, { status: 403 });
  }

  const rateLimit = checkApiRateLimit(request, {
    capacity: 6,
    namespace: "activation:mcp:challenge",
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit);

  try {
    const input = mcpActionChallengeSchema.parse(
      await readBoundedJson(request, 32_768),
    );
    const repository = createActivationRepository();
    const service = await repository.findService(input.serviceId);
    const identity = service
      ? await repository.findAgentIdentity(service.agent_db_id)
      : null;
    if (
      !service ||
      !identity ||
      !isHiringChainId(identity.chainId) ||
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
      return Response.json(
        { error: "This MCP service does not have a current successful check." },
        { status: 409 },
      );
    }

    const inspection = await inspectMcpService(service.endpoint, {
      maxBytes: 65_536,
      timeoutMs: 12_000,
    });
    const tool = inspection.tools.find((candidate) => candidate.name === input.toolName);
    if (!tool) {
      return Response.json({ error: "The selected tool is no longer published." }, { status: 409 });
    }
    if (tool.readOnly) {
      return Response.json({ error: "This read-only tool does not require wallet approval." }, { status: 400 });
    }

    const result = await createMcpActionAuthorization({
      agentId: identity.agentId,
      arguments: input.arguments,
      chainId: identity.chainId,
      origin: new URL(request.url).origin,
      serviceId: input.serviceId,
      toolName: input.toolName,
      walletAddress: getAddress(input.walletAddress),
    });
    return Response.json({ result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Connect a valid wallet and review the tool details." }, { status: 400 });
    }
    const message =
      error instanceof ActivationRemoteError
        ? error.message
        : "Sift could not prepare this one-time tool approval.";
    return Response.json({ error: message }, { status: 422 });
  }
}
