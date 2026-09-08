import type { PasskeyCredential } from "@altananetwork/sdk";
import { isAddress, isHex, type Address, type Hash, type Hex } from "viem";

import type { HiringChainId } from "@/features/hiring/protocol";

const walletStorageKey = "sift:altana:passkey-wallet:v1";
const sessionStorageKey = "sift:altana:public-session:v1";

export type StoredAltanaWallet = Readonly<{
  address: Address;
  createdAt: string;
  credential: Extract<PasskeyCredential, { kind: "webauthn" }>;
}>;

export type AltanaSessionStatus = "active" | "expired" | "revoked" | "unknown";

export type StoredAltanaSession = Readonly<{
  chainId: HiringChainId;
  createdAt: string;
  expiry: number;
  gasCapWei: string;
  grantHash: Hash | null;
  keyId: Hex;
  lastCallsId?: Hex;
  lastHireHash?: Hash;
  publicKey: Hex;
  revokedHash: Hash | null;
  status: AltanaSessionStatus;
  tokenCapBaseUnits: string;
  walletAddress: Address;
}>;

function validDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function parseStoredWallet(value: unknown): StoredAltanaWallet | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<StoredAltanaWallet>;
  const credential = candidate.credential;

  if (
    !isAddress(candidate.address ?? "") ||
    !validDate(candidate.createdAt) ||
    !credential ||
    credential.kind !== "webauthn" ||
    typeof credential.id !== "string" ||
    credential.id.length < 8 ||
    !isHex(credential.publicKey) ||
    (credential.rpId !== undefined && typeof credential.rpId !== "string")
  ) {
    return null;
  }

  return candidate as StoredAltanaWallet;
}

function parseStoredSession(value: unknown): StoredAltanaSession | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<StoredAltanaSession>;

  if (
    (candidate.chainId !== 56 && candidate.chainId !== 97) ||
    !validDate(candidate.createdAt) ||
    !Number.isSafeInteger(candidate.expiry) ||
    (candidate.expiry ?? 0) <= 0 ||
    typeof candidate.gasCapWei !== "string" ||
    !/^(0|[1-9][0-9]{0,77})$/.test(candidate.gasCapWei) ||
    (candidate.grantHash !== null && !isHex(candidate.grantHash ?? "", { strict: true })) ||
    !isHex(candidate.keyId ?? "", { strict: true }) ||
    (candidate.lastCallsId !== undefined &&
      !isHex(candidate.lastCallsId, { strict: true })) ||
    (candidate.lastHireHash !== undefined &&
      !isHex(candidate.lastHireHash, { strict: true })) ||
    !isHex(candidate.publicKey ?? "", { strict: true }) ||
    (candidate.revokedHash !== null && !isHex(candidate.revokedHash ?? "", { strict: true })) ||
    !["active", "expired", "revoked", "unknown"].includes(candidate.status ?? "") ||
    typeof candidate.tokenCapBaseUnits !== "string" ||
    !/^(0|[1-9][0-9]{0,77})$/.test(candidate.tokenCapBaseUnits) ||
    !isAddress(candidate.walletAddress ?? "")
  ) {
    return null;
  }

  return candidate as StoredAltanaSession;
}

function readStorage<T>(key: string, parse: (value: unknown) => T | null): T | null {
  if (typeof window === "undefined") return null;

  try {
    return parse(JSON.parse(window.localStorage.getItem(key) ?? "null"));
  } catch {
    return null;
  }
}

export function readStoredAltanaWallet(): StoredAltanaWallet | null {
  return readStorage(walletStorageKey, parseStoredWallet);
}

export function writeStoredAltanaWallet(wallet: StoredAltanaWallet): void {
  window.localStorage.setItem(walletStorageKey, JSON.stringify(wallet));
}

function chainSessionStorageKey(chainId: HiringChainId): string {
  return `${sessionStorageKey}:${chainId}`;
}

export function readStoredAltanaSession(
  chainId: HiringChainId,
): StoredAltanaSession | null {
  const session = readStorage(chainSessionStorageKey(chainId), parseStoredSession);

  if (session && session.status === "active" && session.expiry <= Date.now() / 1_000) {
    const expired = { ...session, status: "expired" as const };
    writeStoredAltanaSession(expired);
    return expired;
  }

  return session;
}

export function writeStoredAltanaSession(session: StoredAltanaSession): void {
  window.localStorage.setItem(
    chainSessionStorageKey(session.chainId),
    JSON.stringify(session),
  );
}
