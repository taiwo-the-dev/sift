import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { getAddress, type Address } from "viem";

import {
  buildDashboardChallengeMessage,
  DASHBOARD_CHALLENGE_TTL_SECONDS,
  DASHBOARD_SESSION_TTL_SECONDS,
  type DashboardChallenge,
  type DashboardSessionIdentity,
} from "@/features/dashboard/session";
import {
  isHiringChainId,
  type HiringChainId,
} from "@/features/hiring/protocol";
import { getSupabaseServerClient } from "@/lib/db/client";
import type { TableInsert } from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function opaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

function addSeconds(date: Date, seconds: number): string {
  return new Date(date.getTime() + seconds * 1_000).toISOString();
}

export type StoredDashboardChallenge = Readonly<{
  challenge: DashboardChallenge;
  token: string;
}>;

export async function createDashboardChallenge(input: Readonly<{
  chainId: HiringChainId;
  now?: Date;
  origin: string;
  walletAddress: Address;
}>): Promise<StoredDashboardChallenge> {
  const token = opaqueToken();
  const now = input.now ?? new Date();
  const issuedAt = now.toISOString();
  const expiresAt = addSeconds(now, DASHBOARD_CHALLENGE_TTL_SECONDS);
  const walletAddress = getAddress(input.walletAddress);
  const insert: TableInsert<"dashboard_wallet_challenges"> = {
    chain_id: input.chainId,
    expires_at: expiresAt,
    issued_at: issuedAt,
    request_origin: input.origin,
    token_hash: hashToken(token),
    wallet_address: walletAddress.toLowerCase(),
  };
  const client = getSupabaseServerClient();
  const [expiredChallenges, expiredSessions] = await Promise.all([
    client
      .from("dashboard_wallet_challenges")
      .delete()
      .lt("expires_at", issuedAt),
    client.from("dashboard_sessions").delete().lt("expires_at", issuedAt),
  ]);
  if (expiredChallenges.error || expiredSessions.error) {
    throw new DatabaseOperationError(
      "remove expired dashboard sessions",
      expiredChallenges.error ?? expiredSessions.error,
    );
  }

  const superseded = await client
    .from("dashboard_wallet_challenges")
    .update({ consumed_at: issuedAt })
    .eq("wallet_address", walletAddress.toLowerCase())
    .eq("chain_id", input.chainId)
    .is("consumed_at", null);
  if (superseded.error) {
    throw new DatabaseOperationError(
      "replace dashboard wallet challenge",
      superseded.error,
    );
  }

  const { error } = await client
    .from("dashboard_wallet_challenges")
    .insert(insert);

  if (error) {
    throw new DatabaseOperationError("create dashboard wallet challenge", error);
  }

  return {
    challenge: {
      chainId: input.chainId,
      expiresAt,
      message: buildDashboardChallengeMessage({
        chainId: input.chainId,
        expiresAt,
        issuedAt,
        nonce: token,
        origin: input.origin,
        walletAddress,
      }),
      walletAddress,
    },
    token,
  };
}

export async function loadDashboardChallenge(
  token: string,
  now: Date = new Date(),
): Promise<Readonly<{
  id: string;
  chainId: HiringChainId;
  message: string;
  walletAddress: Address;
}> | null> {
  if (!token || token.length > 128) return null;

  const { data, error } = await getSupabaseServerClient()
    .from("dashboard_wallet_challenges")
    .select("*")
    .eq("token_hash", hashToken(token))
    .is("consumed_at", null)
    .gt("expires_at", now.toISOString())
    .maybeSingle();

  if (error) {
    throw new DatabaseOperationError("load dashboard wallet challenge", error);
  }

  if (!data) return null;

  if (!isHiringChainId(data.chain_id)) return null;

  return {
    chainId: data.chain_id,
    id: data.id,
    message: buildDashboardChallengeMessage({
      chainId: data.chain_id,
      expiresAt: data.expires_at,
      issuedAt: data.issued_at,
      nonce: token,
      origin: data.request_origin,
      walletAddress: data.wallet_address,
    }),
    walletAddress: getAddress(data.wallet_address),
  };
}

export async function exchangeDashboardChallenge(input: Readonly<{
  challengeId: string;
  now?: Date;
  walletAddress: Address;
}>): Promise<Readonly<{ identity: DashboardSessionIdentity; token: string }> | null> {
  const client = getSupabaseServerClient();
  const now = input.now ?? new Date();
  const consumed = await client
    .from("dashboard_wallet_challenges")
    .update({ consumed_at: now.toISOString() })
    .eq("id", input.challengeId)
    .is("consumed_at", null)
    .gt("expires_at", now.toISOString())
    .select("id, chain_id")
    .maybeSingle();

  if (consumed.error) {
    throw new DatabaseOperationError("consume dashboard wallet challenge", consumed.error);
  }

  if (!consumed.data) return null;

  if (!isHiringChainId(consumed.data.chain_id)) return null;

  const token = opaqueToken();
  const expiresAt = addSeconds(now, DASHBOARD_SESSION_TTL_SECONDS);
  const walletAddress = getAddress(input.walletAddress);
  const insert: TableInsert<"dashboard_sessions"> = {
    chain_id: consumed.data.chain_id,
    expires_at: expiresAt,
    last_used_at: now.toISOString(),
    token_hash: hashToken(token),
    wallet_address: walletAddress.toLowerCase(),
  };
  const inserted = await client.from("dashboard_sessions").insert(insert);

  if (inserted.error) {
    throw new DatabaseOperationError("create dashboard wallet session", inserted.error);
  }

  return {
    identity: { chainId: consumed.data.chain_id, expiresAt, walletAddress },
    token,
  };
}

export async function getDashboardSession(
  token: string | null,
  now: Date = new Date(),
): Promise<DashboardSessionIdentity | null> {
  if (!token || token.length > 128) return null;

  const client = getSupabaseServerClient();
  const result = await client
    .from("dashboard_sessions")
    .select("*")
    .eq("token_hash", hashToken(token))
    .gt("expires_at", now.toISOString())
    .maybeSingle();

  if (result.error) {
    throw new DatabaseOperationError("load dashboard wallet session", result.error);
  }

  if (!result.data || !isHiringChainId(result.data.chain_id)) return null;

  const touched = await client
    .from("dashboard_sessions")
    .update({ last_used_at: now.toISOString() })
    .eq("id", result.data.id);

  if (touched.error) {
    throw new DatabaseOperationError("refresh dashboard wallet session", touched.error);
  }

  return {
    chainId: result.data.chain_id,
    expiresAt: result.data.expires_at,
    walletAddress: getAddress(result.data.wallet_address),
  };
}

export async function deleteDashboardSession(token: string | null): Promise<void> {
  if (!token || token.length > 128) return;

  const { error } = await getSupabaseServerClient()
    .from("dashboard_sessions")
    .delete()
    .eq("token_hash", hashToken(token));

  if (error) {
    throw new DatabaseOperationError("delete dashboard wallet session", error);
  }
}
