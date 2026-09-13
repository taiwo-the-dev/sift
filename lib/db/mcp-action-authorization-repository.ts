import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getAddress, type Address } from "viem";

import {
  buildMcpActionAuthorizationMessage,
  MCP_ACTION_AUTHORIZATION_TTL_SECONDS,
  type McpActionAuthorizationChallenge,
} from "@/features/activation/action-authorization";
import { isHiringChainId } from "@/features/hiring/protocol";
import { getSupabaseServerClient } from "@/lib/db/client";
import type { TableInsert } from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function opaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

function canonicalJson(value: unknown, depth = 0): string {
  if (depth > 32) {
    throw new TypeError("Tool arguments are nested too deeply.");
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Tool arguments must use finite numbers.");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item, depth + 1)).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Readonly<Record<string, unknown>>)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item, depth + 1)}`)
      .join(",")}}`;
  }
  throw new TypeError("Tool arguments must contain JSON values only.");
}

export function hashMcpToolArguments(
  value: Readonly<Record<string, unknown>>,
): string {
  return sha256(canonicalJson(value));
}

export type StoredMcpActionAuthorization = Readonly<{
  agentId: string;
  argumentsHash: string;
  chainId: 56 | 97;
  id: string;
  message: string;
  serviceId: string;
  toolName: string;
  walletAddress: Address;
}>;

export async function createMcpActionAuthorization(input: Readonly<{
  agentId: string;
  arguments: Readonly<Record<string, unknown>>;
  chainId: 56 | 97;
  now?: Date;
  origin: string;
  serviceId: string;
  toolName: string;
  walletAddress: Address;
}>): Promise<McpActionAuthorizationChallenge> {
  const client = getSupabaseServerClient();
  const now = input.now ?? new Date();
  const issuedAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + MCP_ACTION_AUTHORIZATION_TTL_SECONDS * 1_000,
  ).toISOString();
  const token = opaqueToken();
  const walletAddress = getAddress(input.walletAddress);
  const argumentsHash = hashMcpToolArguments(input.arguments);
  const insert: TableInsert<"mcp_action_authorizations"> = {
    agent_id: input.agentId,
    arguments_hash: argumentsHash,
    chain_id: input.chainId,
    expires_at: expiresAt,
    issued_at: issuedAt,
    request_origin: input.origin,
    service_id: input.serviceId,
    token_hash: sha256(token),
    tool_name: input.toolName,
    wallet_address: walletAddress.toLowerCase(),
  };

  const expired = await client
    .from("mcp_action_authorizations")
    .delete()
    .lt("expires_at", issuedAt);
  if (expired.error) {
    throw new DatabaseOperationError("remove expired MCP action approvals", expired.error);
  }

  const created = await client.from("mcp_action_authorizations").insert(insert);
  if (created.error) {
    throw new DatabaseOperationError("create MCP action approval", created.error);
  }

  return {
    chainId: input.chainId,
    expiresAt,
    message: buildMcpActionAuthorizationMessage({
      agentId: input.agentId,
      argumentsHash,
      chainId: input.chainId,
      expiresAt,
      issuedAt,
      nonce: token,
      origin: input.origin,
      serviceId: input.serviceId,
      toolName: input.toolName,
      walletAddress,
    }),
    token,
    walletAddress,
  };
}

export async function loadMcpActionAuthorization(
  token: string,
  now: Date = new Date(),
): Promise<StoredMcpActionAuthorization | null> {
  if (!token || token.length > 128) return null;

  const result = await getSupabaseServerClient()
    .from("mcp_action_authorizations")
    .select("*")
    .eq("token_hash", sha256(token))
    .is("consumed_at", null)
    .gt("expires_at", now.toISOString())
    .maybeSingle();
  if (result.error) {
    throw new DatabaseOperationError("load MCP action approval", result.error);
  }
  if (!result.data || !isHiringChainId(result.data.chain_id)) return null;

  return {
    agentId: result.data.agent_id,
    argumentsHash: result.data.arguments_hash,
    chainId: result.data.chain_id,
    id: result.data.id,
    message: buildMcpActionAuthorizationMessage({
      agentId: result.data.agent_id,
      argumentsHash: result.data.arguments_hash,
      chainId: result.data.chain_id,
      expiresAt: result.data.expires_at,
      issuedAt: result.data.issued_at,
      nonce: token,
      origin: result.data.request_origin,
      serviceId: result.data.service_id,
      toolName: result.data.tool_name,
      walletAddress: result.data.wallet_address,
    }),
    serviceId: result.data.service_id,
    toolName: result.data.tool_name,
    walletAddress: getAddress(result.data.wallet_address),
  };
}

export async function consumeMcpActionAuthorization(
  id: string,
  now: Date = new Date(),
): Promise<boolean> {
  const result = await getSupabaseServerClient()
    .from("mcp_action_authorizations")
    .update({ consumed_at: now.toISOString() })
    .eq("id", id)
    .is("consumed_at", null)
    .gt("expires_at", now.toISOString())
    .select("id")
    .maybeSingle();
  if (result.error) {
    throw new DatabaseOperationError("consume MCP action approval", result.error);
  }
  return result.data !== null;
}
