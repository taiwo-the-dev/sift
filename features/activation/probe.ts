import { getAddress, isAddress } from "viem";

import {
  ACTIVATION_VALIDATION_VERSION,
  type ActivationCandidate,
  type ActivationObservation,
} from "@/features/activation/model";
import {
  inspectA2aService,
  inspectMcpService,
  inspectX402Service,
} from "@/features/activation/protocol";
import { ActivationRemoteError } from "@/features/activation/remote";
import { resolveHiringCompatibility } from "@/features/hiring/compatibility";
import { parseAgentCommerceStatus } from "@/features/hiring/quote";
import { fetchSafeAgentJson } from "@/features/hiring/remote";
import type { Json } from "@/lib/db/database.types";

export type ActivationProbeOptions = Readonly<{
  fetchImpl?: typeof fetch;
  maxBytes: number;
  timeoutMs: number;
}>;

function json(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function failed(
  candidate: ActivationCandidate,
  error: unknown,
): ActivationObservation {
  const code =
    error instanceof ActivationRemoteError
      ? error.code
      : error instanceof Error && error.name === "ZodError"
        ? "invalid-response"
        : "protocol-error";

  return {
    capabilitySummary: null,
    failureCode: code,
    method: candidate.method,
    responseTimeMs: null,
    serviceId: candidate.serviceId,
    status:
      code === "unsafe-endpoint" || code === "invalid-response"
        ? "unsupported"
        : candidate.lastSuccessAt && candidate.failureCount < 2
          ? "degraded"
          : "unavailable",
  };
}

async function inspectErc8183(
  candidate: ActivationCandidate,
  options: ActivationProbeOptions,
): Promise<ActivationObservation> {
  if (
    (candidate.chainId !== 56 && candidate.chainId !== 97) ||
    !candidate.ownerAddress ||
    !isAddress(candidate.ownerAddress)
  ) {
    throw new ActivationRemoteError(
      "invalid-response",
      "The ERC-8183 identity does not match a supported BNB network and owner.",
    );
  }

  const compatibility = resolveHiringCompatibility({
    active: true,
    chainId: candidate.chainId,
    metadataStatus: "valid",
    ownerAddress: candidate.ownerAddress,
    services: [
      {
        endpoint: candidate.endpoint,
        serviceType: candidate.serviceType,
        version: candidate.version,
      },
    ],
  });
  if (!compatibility) {
    throw new ActivationRemoteError(
      "invalid-response",
      "The ERC-8183 declaration is unsupported.",
    );
  }

  const startedAt = performance.now();
  const document = await fetchSafeAgentJson(compatibility.statusUrl, {
    fetchImpl: options.fetchImpl,
    method: "GET",
    timeoutMs: options.timeoutMs,
  });
  const status = parseAgentCommerceStatus(
    document,
    getAddress(candidate.ownerAddress),
    candidate.chainId,
  );

  return {
    capabilitySummary: json({
      agentAddress: status.agentAddress,
      servicePrice: status.servicePrice.toString(),
      statusUrl: compatibility.statusUrl,
      validationVersion: ACTIVATION_VALIDATION_VERSION,
    }),
    failureCode: null,
    method: candidate.method,
    responseTimeMs: Math.max(0, Math.round(performance.now() - startedAt)),
    serviceId: candidate.serviceId,
    status: "available",
  };
}

export async function probeActivationService(
  candidate: ActivationCandidate,
  options: ActivationProbeOptions,
): Promise<ActivationObservation> {
  try {
    if (candidate.method === "erc8183") {
      return await inspectErc8183(candidate, options);
    }

    if (candidate.method === "mcp") {
      const inspection = await inspectMcpService(candidate.endpoint, options);
      const tools = inspection.tools.map((tool) => ({
        destructive: tool.destructive,
        description: tool.description,
        idempotent: tool.idempotent,
        inputSchema: tool.inputSchema,
        name: tool.name,
        openWorld: tool.openWorld,
        readOnly: tool.readOnly,
      }));
      const hasTools = tools.length > 0;
      return {
        capabilitySummary: json({ tools }),
        failureCode: hasTools ? null : "no-tools",
        method: candidate.method,
        responseTimeMs: inspection.responseTimeMs,
        serviceId: candidate.serviceId,
        status: hasTools ? "available" : "unsupported",
      };
    }

    if (candidate.method === "a2a") {
      const inspection = await inspectA2aService(candidate.endpoint, options);
      return {
        capabilitySummary: json(inspection.card),
        failureCode: null,
        method: candidate.method,
        responseTimeMs: inspection.responseTimeMs,
        serviceId: candidate.serviceId,
        status: "available",
      };
    }

    const inspection = await inspectX402Service(
      candidate.endpoint,
      candidate.chainId,
      options,
    );
    return {
      capabilitySummary: json({
        free: inspection.free,
        options: inspection.options,
      }),
      failureCode: null,
      method: candidate.method,
      responseTimeMs: inspection.responseTimeMs,
      serviceId: candidate.serviceId,
      status: "available",
    };
  } catch (error) {
    return failed(candidate, error);
  }
}
