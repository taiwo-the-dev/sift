import { getAddress, type Address } from "viem";

import { HIRING_CHAIN_ID } from "@/features/hiring/protocol";

export const DASHBOARD_CHALLENGE_TTL_SECONDS = 5 * 60;
export const DASHBOARD_SESSION_TTL_SECONDS = 4 * 60 * 60;
export const DASHBOARD_CHALLENGE_COOKIE = "sift_dashboard_challenge";
export const DASHBOARD_SESSION_COOKIE = "sift_dashboard_session";

export type DashboardSessionIdentity = Readonly<{
  chainId: typeof HIRING_CHAIN_ID;
  expiresAt: string;
  walletAddress: Address;
}>;

export type DashboardChallenge = Readonly<{
  expiresAt: string;
  message: string;
  walletAddress: Address;
}>;

function canonicalChallengeTimestamp(value: string): string {
  const timestamp = new Date(value);

  if (Number.isNaN(timestamp.getTime())) {
    throw new TypeError("Dashboard challenge timestamps must be valid ISO dates.");
  }

  return timestamp.toISOString();
}

export function buildDashboardChallengeMessage(input: Readonly<{
  chainId: number;
  expiresAt: string;
  issuedAt: string;
  nonce: string;
  origin: string;
  walletAddress: string;
}>): string {
  const issuedAt = canonicalChallengeTimestamp(input.issuedAt);
  const expiresAt = canonicalChallengeTimestamp(input.expiresAt);

  return [
    "Sift Dashboard",
    "",
    "Approve read-only access to jobs owned by this wallet.",
    "",
    `URI: ${input.origin}`,
    `Wallet: ${getAddress(input.walletAddress)}`,
    `Chain ID: ${input.chainId}`,
    `Nonce: ${input.nonce}`,
    `Issued At: ${issuedAt}`,
    `Expiration Time: ${expiresAt}`,
    "",
    "This signature does not submit a transaction or grant spending permission.",
  ].join("\n");
}
