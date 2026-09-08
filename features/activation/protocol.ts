import { isAddress } from "viem";
import { z } from "zod";

import type { Json } from "@/lib/db/database.types";
import type { HostResolver } from "@/lib/indexer/metadata/url-safety";
import {
  ActivationRemoteError,
  parseJsonBody,
  parseJsonOrSse,
  requestActivationService,
} from "@/features/activation/remote";

const jsonRpcEnvelopeSchema = z.object({
  error: z.unknown().optional(),
  id: z.union([z.string(), z.number(), z.null()]).optional(),
  jsonrpc: z.literal("2.0"),
  result: z.unknown().optional(),
});

const mcpToolSchema = z.object({
  annotations: z
    .object({ readOnlyHint: z.boolean().optional() })
    .loose()
    .optional(),
  description: z.string().max(1_000).optional(),
  inputSchema: z.record(z.string(), z.unknown()).optional(),
  name: z.string().trim().min(1).max(128),
});

const mcpToolsResultSchema = z.object({
  tools: z.array(mcpToolSchema).max(100),
});

const a2aCardSchema = z
  .object({
    description: z.string().max(2_000).optional(),
    name: z.string().trim().min(1).max(256),
    skills: z
      .array(
        z
          .object({
            description: z.string().max(1_000).optional(),
            id: z.string().trim().min(1).max(128),
            name: z.string().trim().min(1).max(256),
          })
          .loose(),
      )
      .max(100)
      .optional(),
    url: z.url().optional(),
  })
  .loose();

const x402RequirementSchema = z
  .object({
    amount: z.string().regex(/^(0|[1-9][0-9]*)$/).optional(),
    asset: z.string(),
    maxAmountRequired: z.string().regex(/^(0|[1-9][0-9]*)$/).optional(),
    network: z.string().min(1).max(80),
    payTo: z.string(),
    scheme: z.string().min(1).max(80),
  })
  .loose()
  .refine((value) => value.amount !== undefined || value.maxAmountRequired !== undefined);

const x402ChallengeSchema = z
  .object({ accepts: z.array(x402RequirementSchema).min(1).max(20) })
  .loose();

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ActivationRemoteError("invalid-response", "The service returned an invalid protocol response.");
  }
  return value as Record<string, unknown>;
}

function json(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function parseRpcResult(value: unknown): unknown {
  const envelope = jsonRpcEnvelopeSchema.parse(value);
  if (envelope.error !== undefined || envelope.result === undefined) {
    throw new ActivationRemoteError("invalid-response", "The service returned a JSON-RPC error.");
  }
  return envelope.result;
}

export type McpToolSummary = Readonly<{
  description: string | null;
  inputSchema: Readonly<Record<string, unknown>>;
  name: string;
  readOnly: boolean;
}>;

export type McpInspection = Readonly<{
  responseTimeMs: number;
  sessionId: string | null;
  tools: readonly McpToolSummary[];
}>;

function argumentsMatchSchema(
  value: Readonly<Record<string, unknown>>,
  schema: Readonly<Record<string, unknown>>,
): boolean {
  if (schema.type !== undefined && schema.type !== "object") return false;
  const required = Array.isArray(schema.required)
    ? schema.required.filter((item): item is string => typeof item === "string")
    : [];
  if (required.some((key) => !(key in value))) return false;

  const properties =
    typeof schema.properties === "object" &&
    schema.properties !== null &&
    !Array.isArray(schema.properties)
      ? (schema.properties as Readonly<Record<string, unknown>>)
      : {};
  if (
    schema.additionalProperties === false &&
    Object.keys(value).some((key) => !(key in properties))
  ) {
    return false;
  }

  return Object.entries(value).every(([key, item]) => {
    const rawRule = properties[key];
    if (typeof rawRule !== "object" || rawRule === null || Array.isArray(rawRule)) {
      return true;
    }
    const rule = rawRule as Readonly<Record<string, unknown>>;
    if (rule.type === "string") return typeof item === "string";
    if (rule.type === "number") return typeof item === "number" && Number.isFinite(item);
    if (rule.type === "integer") return typeof item === "number" && Number.isInteger(item);
    if (rule.type === "boolean") return typeof item === "boolean";
    if (rule.type === "array") return Array.isArray(item);
    if (rule.type === "object") return typeof item === "object" && item !== null && !Array.isArray(item);
    return rule.type === undefined;
  });
}

export async function inspectMcpService(
  endpoint: string,
  options: Readonly<{
    fetchImpl?: typeof fetch;
    maxBytes?: number;
    resolveHost?: HostResolver;
    timeoutMs?: number;
  }> = {},
): Promise<McpInspection> {
  const initialize = await requestActivationService(endpoint, {
    ...options,
    body: JSON.stringify({
      id: 1,
      jsonrpc: "2.0",
      method: "initialize",
      params: {
        capabilities: {},
        clientInfo: { name: "Sift", version: "1.0.0" },
        protocolVersion: "2025-06-18",
      },
    }),
    method: "POST",
  });
  if (initialize.status < 200 || initialize.status >= 300) {
    throw new ActivationRemoteError("http-error", "The MCP service rejected initialization.");
  }
  parseRpcResult(parseJsonOrSse(initialize.body));
  const sessionId = initialize.headers.get("mcp-session-id");
  const sessionHeaders = {
    "mcp-protocol-version": "2025-06-18",
    ...(sessionId ? { "mcp-session-id": sessionId } : {}),
  };

  const initialized = await requestActivationService(endpoint, {
    ...options,
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    headers: sessionHeaders,
    method: "POST",
  });
  if (initialized.status < 200 || initialized.status >= 300) {
    throw new ActivationRemoteError("http-error", "The MCP service rejected initialization.");
  }

  const listed = await requestActivationService(endpoint, {
    ...options,
    body: JSON.stringify({ id: 2, jsonrpc: "2.0", method: "tools/list", params: {} }),
    headers: sessionHeaders,
    method: "POST",
  });
  if (listed.status < 200 || listed.status >= 300) {
    throw new ActivationRemoteError("http-error", "The MCP service did not provide a tool list.");
  }
  const result = mcpToolsResultSchema.parse(parseRpcResult(parseJsonOrSse(listed.body)));
  return {
    responseTimeMs:
      initialize.responseTimeMs +
      initialized.responseTimeMs +
      listed.responseTimeMs,
    sessionId,
    tools: result.tools.map((tool) => ({
      description: tool.description ?? null,
      inputSchema: tool.inputSchema ?? {},
      name: tool.name,
      readOnly: tool.annotations?.readOnlyHint === true,
    })),
  };
}

export async function callReadOnlyMcpTool(input: Readonly<{
  arguments: Readonly<Record<string, unknown>>;
  endpoint: string;
  fetchImpl?: typeof fetch;
  maxBytes?: number;
  resolveHost?: HostResolver;
  timeoutMs?: number;
  toolName: string;
}>): Promise<Json> {
  const inspection = await inspectMcpService(input.endpoint, input);
  const tool = inspection.tools.find((candidate) => candidate.name === input.toolName);
  if (!tool || !tool.readOnly) {
    throw new ActivationRemoteError(
      "invalid-response",
      "Sift only runs tools that the live MCP service marks as read-only.",
    );
  }
  if (!argumentsMatchSchema(input.arguments, tool.inputSchema)) {
    throw new ActivationRemoteError(
      "invalid-response",
      "The tool arguments do not match the live MCP input schema.",
    );
  }
  const response = await requestActivationService(input.endpoint, {
    body: JSON.stringify({
      id: 3,
      jsonrpc: "2.0",
      method: "tools/call",
      params: { arguments: input.arguments, name: tool.name },
    }),
    fetchImpl: input.fetchImpl,
    headers: inspection.sessionId
      ? {
          "mcp-protocol-version": "2025-06-18",
          "mcp-session-id": inspection.sessionId,
        }
      : { "mcp-protocol-version": "2025-06-18" },
    maxBytes: input.maxBytes,
    method: "POST",
    resolveHost: input.resolveHost,
    timeoutMs: input.timeoutMs,
  });
  if (response.status < 200 || response.status >= 300) {
    throw new ActivationRemoteError("http-error", "The MCP tool call failed.");
  }
  return json(parseRpcResult(parseJsonOrSse(response.body)));
}

export function a2aCardUrl(endpoint: string): string {
  const url = new URL(endpoint);
  if (url.pathname.includes("/.well-known/agent-card.json")) return url.toString();
  return new URL("/.well-known/agent-card.json", url.origin).toString();
}

export async function inspectA2aService(
  endpoint: string,
  options: Readonly<{
    fetchImpl?: typeof fetch;
    maxBytes?: number;
    resolveHost?: HostResolver;
    timeoutMs?: number;
  }> = {},
) {
  const response = await requestActivationService(a2aCardUrl(endpoint), {
    ...options,
    method: "GET",
  });
  if (response.status < 200 || response.status >= 300) {
    throw new ActivationRemoteError("http-error", "The A2A agent card is unavailable.");
  }
  const card = a2aCardSchema.parse(parseJsonBody(response.body));
  const taskEndpoint = card.url ?? endpoint;
  // Resolve and DNS-check the advertised task URL now; it is checked again on use.
  const taskProbe = await requestActivationService(taskEndpoint, {
    ...options,
    body: JSON.stringify({ id: "sift-check", jsonrpc: "2.0", method: "tasks/get", params: { id: "sift-capability-check" } }),
    method: "POST",
  });
  if (taskProbe.status < 200 || taskProbe.status >= 300) {
    throw new ActivationRemoteError("http-error", "The A2A task service is unavailable.");
  }
  jsonRpcEnvelopeSchema.parse(parseJsonOrSse(taskProbe.body));
  return {
    card: {
      description: card.description ?? null,
      name: card.name,
      skills: (card.skills ?? []).map((skill) => ({
        description: skill.description ?? null,
        id: skill.id,
        name: skill.name,
      })),
      taskEndpoint,
    },
    responseTimeMs: response.responseTimeMs,
  };
}

export async function sendA2aTask(input: Readonly<{
  endpoint: string;
  fetchImpl?: typeof fetch;
  maxBytes?: number;
  message: string;
  resolveHost?: HostResolver;
  timeoutMs?: number;
}>): Promise<Json> {
  const inspection = await inspectA2aService(input.endpoint, input);
  const response = await requestActivationService(inspection.card.taskEndpoint, {
    body: JSON.stringify({
      id: crypto.randomUUID(),
      jsonrpc: "2.0",
      method: "message/send",
      params: {
        message: {
          kind: "message",
          messageId: crypto.randomUUID(),
          parts: [{ kind: "text", text: input.message }],
          role: "user",
        },
      },
    }),
    fetchImpl: input.fetchImpl,
    maxBytes: input.maxBytes,
    method: "POST",
    resolveHost: input.resolveHost,
    timeoutMs: input.timeoutMs,
  });
  if (response.status < 200 || response.status >= 300) {
    throw new ActivationRemoteError("http-error", "The A2A task request failed.");
  }
  return json(parseRpcResult(parseJsonOrSse(response.body)));
}

function decodePaymentRequired(value: string): unknown {
  try {
    return JSON.parse(Buffer.from(value, "base64").toString("utf8")) as unknown;
  } catch {
    throw new ActivationRemoteError("invalid-response", "The x402 payment challenge is invalid.");
  }
}

export async function inspectX402Service(
  endpoint: string,
  chainId: number,
  options: Readonly<{
    fetchImpl?: typeof fetch;
    maxBytes?: number;
    resolveHost?: HostResolver;
    timeoutMs?: number;
  }> = {},
) {
  const response = await requestActivationService(endpoint, { ...options, method: "GET" });
  if (response.status >= 200 && response.status < 300) {
    return { free: true, options: [], responseTimeMs: response.responseTimeMs };
  }
  if (response.status !== 402) {
    throw new ActivationRemoteError("http-error", "The x402 service is unavailable.");
  }
  const header = response.headers.get("payment-required");
  const raw = header ? decodePaymentRequired(header) : parseJsonBody(response.body);
  const challenge = x402ChallengeSchema.parse(object(raw));
  const accepted = challenge.accepts.flatMap((option) => {
    const requiredChain = option.network === `eip155:${chainId}` ||
      (chainId === 56 && option.network === "bsc") ||
      (chainId === 97 && option.network === "bsc-testnet");
    const amount = option.amount ?? option.maxAmountRequired!;
    if (
      !requiredChain ||
      option.scheme !== "exact" ||
      BigInt(amount) === 0n ||
      !isAddress(option.asset) ||
      !isAddress(option.payTo)
    ) return [];
    return [{
      amount,
      asset: option.asset,
      network: option.network,
      payTo: option.payTo,
      scheme: option.scheme,
    }];
  });
  if (accepted.length === 0) {
    throw new ActivationRemoteError("invalid-response", "No x402 option matches this agent's BNB network.");
  }
  return { free: false, options: accepted, responseTimeMs: response.responseTimeMs };
}
