import { getAddress, type Address } from "viem";

export const MCP_ACTION_AUTHORIZATION_TTL_SECONDS = 5 * 60;

function canonicalTimestamp(value: string): string {
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    throw new TypeError("Action authorization timestamps must be valid ISO dates.");
  }
  return timestamp.toISOString();
}

export type McpActionAuthorizationChallenge = Readonly<{
  chainId: 56 | 97;
  expiresAt: string;
  message: string;
  token: string;
  walletAddress: Address;
}>;

export function buildMcpActionAuthorizationMessage(input: Readonly<{
  agentId: string;
  argumentsHash: string;
  chainId: number;
  expiresAt: string;
  issuedAt: string;
  nonce: string;
  origin: string;
  serviceId: string;
  toolName: string;
  walletAddress: string;
}>): string {
  return [
    "Sift Agent Tool Authorization",
    "",
    "Approve one non-read-only agent tool request.",
    "",
    `URI: ${input.origin}`,
    `Wallet: ${getAddress(input.walletAddress)}`,
    `Chain ID: ${input.chainId}`,
    `Agent ID: ${input.agentId}`,
    `Service ID: ${input.serviceId}`,
    `Tool: ${input.toolName}`,
    `Request digest: ${input.argumentsHash}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${canonicalTimestamp(input.issuedAt)}`,
    `Expiration Time: ${canonicalTimestamp(input.expiresAt)}`,
    "",
    "This signature authorizes one request only. It does not submit a blockchain transaction or grant spending permission.",
  ].join("\n");
}
