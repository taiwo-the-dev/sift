"use client";

import type {
  Client,
  NetworkConfig,
  Session,
  Signer,
  Wallet,
} from "@altananetwork/sdk";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import {
  createPublicClient,
  getAddress,
  http,
  type Hash,
  type Hex,
} from "viem";

import {
  ALTANA_DEFAULT_SESSION_SECONDS,
  ALTANA_NATIVE_GAS_CAP_WEI,
  altanaKeyId,
  assertAltanaSdkNetwork,
  buildAltanaBuyerPermissions,
  buildExactCommerceApprovalCall,
  commerceJobCounterAbi,
  getAltanaNetwork,
  removeUnsafeApprovalCall,
  requiresExactCommerceApproval,
  type AltanaExecutionResult,
} from "@/features/altana/protocol";
import {
  readStoredAltanaSession,
  readStoredAltanaWallet,
  writeStoredAltanaSession,
  writeStoredAltanaWallet,
  type StoredAltanaSession,
  type StoredAltanaWallet,
} from "@/features/altana/storage";
import type { HiringIntentSnapshot } from "@/features/hiring/model";
import {
  getErc8183Deployment,
  type HiringChainId,
} from "@/features/hiring/protocol";

type AltanaSdk = typeof import("@altananetwork/sdk");

type AdminWallet = Readonly<{
  signer: Signer;
  wallet: Wallet;
}>;

type LiveSessions = Partial<Record<HiringChainId, Session>>;
type PublicSessions = Partial<Record<HiringChainId, StoredAltanaSession>>;

export type AltanaSessionVerification = Readonly<{
  active: boolean;
  checkedAt: string;
  keyId: Hex;
  keyStore: `0x${string}`;
}>;

type AltanaContextValue = Readonly<{
  approveExactHiringBudget: (
    chainId: HiringChainId,
    budget: bigint,
  ) => Promise<AltanaExecutionResult | null>;
  createPasskeyWallet: () => Promise<void>;
  executeSessionHire: (
    intent: HiringIntentSnapshot,
  ) => Promise<AltanaExecutionResult>;
  grantHiringSession: (
    chainId: HiringChainId,
    tokenCap: bigint,
    seconds?: number,
  ) => Promise<StoredAltanaSession>;
  hasLiveSession: (chainId: HiringChainId) => boolean;
  publicSessions: PublicSessions;
  recoverPasskeyWallet: (chainId: HiringChainId) => Promise<void>;
  refreshSession: (
    chainId: HiringChainId,
  ) => Promise<AltanaSessionVerification | null>;
  revokeHiringSession: (
    chainId: HiringChainId,
  ) => Promise<AltanaExecutionResult>;
  walletAddress: `0x${string}` | null;
}>;

const AltanaSessionContext = createContext<AltanaContextValue | null>(null);

async function loadSdk(): Promise<
  Readonly<{
    client: Client;
    networkFor: (chainId: HiringChainId) => NetworkConfig;
    sdk: AltanaSdk;
  }>
> {
  const sdk = await import("@altananetwork/sdk");
  const networks = [sdk.BNB, sdk.BNB_TESTNET] as const;

  for (const network of networks) {
    const chainId = network.chainId as HiringChainId;
    const sdkErc8183 = sdk.erc8183Addresses(chainId);
    assertAltanaSdkNetwork({
      chainId,
      commerce: sdkErc8183.commerce,
      keyStore: network.keyStore,
      keyStoreController: network.keyStoreController,
      paymentToken: sdkErc8183.paymentToken,
      policy: sdkErc8183.policy,
      registry: sdkErc8183.registry,
      router: sdkErc8183.router,
    });
  }

  return {
    client: sdk.createClient({ chains: [...networks] }),
    networkFor: (chainId) => (chainId === 56 ? sdk.BNB : sdk.BNB_TESTNET),
    sdk,
  };
}

function storedSessions(): PublicSessions {
  return {
    56: readStoredAltanaSession(56) ?? undefined,
    97: readStoredAltanaSession(97) ?? undefined,
  };
}

function assertSessionCoversIntent(
  session: StoredAltanaSession | undefined,
  intent: HiringIntentSnapshot,
): void {
  if (
    !session ||
    session.status !== "active" ||
    session.lastHireHash !== undefined ||
    session.walletAddress.toLowerCase() !== intent.walletAddress.toLowerCase() ||
    session.expiry <= Date.now() / 1_000 + 60 ||
    BigInt(session.tokenCapBaseUnits) !== BigInt(intent.budgetBaseUnits)
  ) {
    throw new Error(
      "Create an active Altana session with enough budget and time before hiring.",
    );
  }
}

export function AltanaSessionProvider({ children }: PropsWithChildren) {
  const [storedWallet, setStoredWallet] = useState<StoredAltanaWallet | null>(null);
  const [adminWallet, setAdminWallet] = useState<AdminWallet | null>(null);
  const [liveSessions, setLiveSessions] = useState<LiveSessions>({});
  const [publicSessions, setPublicSessions] = useState<PublicSessions>({});

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setStoredWallet(readStoredAltanaWallet());
      setPublicSessions(storedSessions());
    });
    return () => {
      active = false;
    };
  }, []);

  const ensureAdminWallet = useCallback(async (): Promise<AdminWallet> => {
    if (adminWallet) return adminWallet;

    const persisted = storedWallet ?? readStoredAltanaWallet();
    if (!persisted) {
      throw new Error("Create or recover your Sift passkey wallet first.");
    }

    const { sdk } = await loadSdk();
    const signer = sdk.signerFromPasskey(persisted.credential);
    const restored = {
      signer,
      wallet: { address: persisted.address },
    } satisfies AdminWallet;
    setStoredWallet(persisted);
    setAdminWallet(restored);
    return restored;
  }, [adminWallet, storedWallet]);

  const createPasskeyWallet = useCallback(async (): Promise<void> => {
    if (storedWallet ?? readStoredAltanaWallet()) {
      throw new Error(
        "A Sift passkey wallet already exists on this device. Recover or use it instead of creating another.",
      );
    }

    if (!window.PublicKeyCredential) {
      throw new Error("This browser does not support passkeys.");
    }

    const { client } = await loadSdk();
    const created = await client.createPasskeyWallet({ name: "Sift agent wallet" });

    if (created.signer.credential.kind !== "webauthn") {
      throw new Error("Sift received an unsupported passkey credential.");
    }

    const persisted: StoredAltanaWallet = {
      address: getAddress(created.address),
      createdAt: new Date().toISOString(),
      credential: created.signer.credential,
    };
    writeStoredAltanaWallet(persisted);
    setStoredWallet(persisted);
    setAdminWallet({ signer: created.signer, wallet: created });
  }, [storedWallet]);

  const recoverPasskeyWallet = useCallback(
    async (chainId: HiringChainId): Promise<void> => {
      if (!window.PublicKeyCredential) {
        throw new Error("This browser does not support passkeys.");
      }

      const { client } = await loadSdk();
      const recovered = await client.recoverFromPasskey({ chainId });

      if (recovered.signer.credential.kind !== "webauthn") {
        throw new Error("Sift received an unsupported passkey credential.");
      }

      const persisted: StoredAltanaWallet = {
        address: getAddress(recovered.address),
        createdAt: new Date().toISOString(),
        credential: recovered.signer.credential,
      };
      writeStoredAltanaWallet(persisted);
      setStoredWallet(persisted);
      setAdminWallet({ signer: recovered.signer, wallet: recovered });
    },
    [],
  );

  const refreshSession = useCallback(
    async (
      chainId: HiringChainId,
    ): Promise<AltanaSessionVerification | null> => {
      const session = publicSessions[chainId] ?? readStoredAltanaSession(chainId);
      if (!session) return null;

      const params = new URLSearchParams({
        chainId: String(chainId),
        publicKey: session.publicKey,
        wallet: session.walletAddress,
      });
      const response = await fetch(`/api/altana/session?${params}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as
        | AltanaSessionVerification
        | { error?: unknown };

      if (!response.ok || !("active" in payload)) {
        const responseError = "error" in payload ? payload.error : undefined;
        throw new Error(
          typeof responseError === "string"
            ? responseError
            : "Sift could not verify the Altana session.",
        );
      }

      const next: StoredAltanaSession = {
        ...session,
        status: payload.active
          ? "active"
          : session.expiry <= Date.now() / 1_000
            ? "expired"
            : "revoked",
      };
      writeStoredAltanaSession(next);
      setPublicSessions((current) => ({ ...current, [chainId]: next }));
      return payload;
    },
    [publicSessions],
  );

  const grantHiringSession = useCallback(
    async (
      chainId: HiringChainId,
      tokenCap: bigint,
      seconds = ALTANA_DEFAULT_SESSION_SECONDS,
    ): Promise<StoredAltanaSession> => {
      const current = publicSessions[chainId] ?? readStoredAltanaSession(chainId);
      if (current?.status === "active" && current.expiry > Date.now() / 1_000) {
        throw new Error("Revoke the current session before creating another one.");
      }

      if (!Number.isSafeInteger(seconds) || seconds < 900 || seconds > 86_400) {
        throw new Error("Session duration must be between 15 minutes and 24 hours.");
      }

      const admin = await ensureAdminWallet();
      const { client } = await loadSdk();
      const expiry = Math.floor(Date.now() / 1_000) + seconds;
      const granted = await client.grantSession({
        chainId,
        expiry,
        permissions: buildAltanaBuyerPermissions(chainId, tokenCap),
        register: true,
        signer: admin.signer,
        wallet: admin.wallet,
      });
      const record: StoredAltanaSession = {
        chainId,
        createdAt: new Date().toISOString(),
        expiry,
        gasCapWei: ALTANA_NATIVE_GAS_CAP_WEI.toString(),
        grantHash: granted.transactionHash ?? null,
        keyId: altanaKeyId(granted.publicKey),
        publicKey: granted.publicKey,
        revokedHash: null,
        status: "active",
        tokenCapBaseUnits: tokenCap.toString(),
        walletAddress: getAddress(granted.walletAddress),
      };
      writeStoredAltanaSession(record);
      setLiveSessions((current) => ({ ...current, [chainId]: granted }));
      setPublicSessions((current) => ({ ...current, [chainId]: record }));
      return record;
    },
    [ensureAdminWallet, publicSessions],
  );

  const revokeHiringSession = useCallback(
    async (chainId: HiringChainId): Promise<AltanaExecutionResult> => {
      const record = publicSessions[chainId] ?? readStoredAltanaSession(chainId);
      if (!record) throw new Error("No Altana session is available to revoke.");

      const admin = await ensureAdminWallet();
      const { client } = await loadSdk();
      const result = await client.revokeSession({
        chainId,
        session: liveSessions[chainId] ?? record.publicKey,
        signer: admin.signer,
        wallet: admin.wallet,
      });
      const next: StoredAltanaSession = {
        ...record,
        revokedHash: result.transactionHash ?? null,
        status: result.status === "CONFIRMED" ? "revoked" : "unknown",
      };
      writeStoredAltanaSession(next);
      setLiveSessions((current) => ({ ...current, [chainId]: undefined }));
      setPublicSessions((current) => ({ ...current, [chainId]: next }));
      return result;
    },
    [ensureAdminWallet, liveSessions, publicSessions],
  );

  const approveExactHiringBudget = useCallback(
    async (
      chainId: HiringChainId,
      budget: bigint,
    ): Promise<AltanaExecutionResult | null> => {
      if (budget === 0n) return null;
      const admin = await ensureAdminWallet();
      const { client, networkFor } = await loadSdk();
      const deployment = getErc8183Deployment(chainId);
      const network = networkFor(chainId);
      const publicClient = createPublicClient({
        chain: network.chain,
        transport: http(network.publicRpcUrl),
      });
      const allowance = await publicClient.readContract({
        address: deployment.paymentToken,
        abi: [
          {
            type: "function",
            name: "allowance",
            stateMutability: "view",
            inputs: [
              { name: "owner", type: "address" },
              { name: "spender", type: "address" },
            ],
            outputs: [{ type: "uint256" }],
          },
        ] as const,
        functionName: "allowance",
        args: [admin.wallet.address, deployment.commerce],
      });

      if (!requiresExactCommerceApproval(allowance, budget)) return null;
      return client.execute({
        calls: buildExactCommerceApprovalCall(chainId, budget),
        chainId,
        signer: admin.signer,
        wallet: admin.wallet,
      });
    },
    [ensureAdminWallet],
  );

  const executeSessionHire = useCallback(
    async (intent: HiringIntentSnapshot): Promise<AltanaExecutionResult> => {
      const sessionRecord = publicSessions[intent.chainId];
      const session = liveSessions[intent.chainId];
      assertSessionCoversIntent(sessionRecord, intent);

      if (!session) {
        throw new Error(
          "The session key is no longer in memory. Revoke this session and restart the hire; Sift never saves session private keys in browser storage.",
        );
      }

      const { client, networkFor, sdk } = await loadSdk();
      const network = networkFor(intent.chainId);
      const deployment = getErc8183Deployment(intent.chainId);
      const publicClient = createPublicClient({
        chain: network.chain,
        transport: http(network.publicRpcUrl),
      });
      const currentJobId = await publicClient.readContract({
        address: deployment.commerce,
        abi: commerceJobCounterAbi,
        functionName: "jobCounter",
      });
      const officialCalls = sdk.buildHireCalls({
        addresses: {
          commerce: deployment.commerce,
          paymentToken: deployment.paymentToken,
          policy: deployment.policy,
          registry: getAltanaNetwork(intent.chainId).registry,
          router: deployment.router,
        },
        budget: BigInt(intent.budgetBaseUnits),
        description: intent.onchainDescription,
        expiredAt: BigInt(Math.floor(Date.parse(intent.expiresAt) / 1_000)),
        jobId: currentJobId + 1n,
        provider: intent.providerAddress,
      });
      const protectedCalls = removeUnsafeApprovalCall(
        officialCalls,
        intent.chainId,
      );
      const result = await client.execute({
        calls: protectedCalls,
        chainId: intent.chainId,
        session,
      });
      const nextRecord: StoredAltanaSession = {
        ...sessionRecord!,
        lastCallsId: result.callsId,
        ...(result.transactionHash
          ? { lastHireHash: result.transactionHash as Hash }
          : {}),
      };
      writeStoredAltanaSession(nextRecord);
      setPublicSessions((current) => ({
        ...current,
        [intent.chainId]: nextRecord,
      }));
      return result;
    },
    [liveSessions, publicSessions],
  );

  const value = useMemo<AltanaContextValue>(
    () => ({
      approveExactHiringBudget,
      createPasskeyWallet,
      executeSessionHire,
      grantHiringSession,
      hasLiveSession: (chainId) => Boolean(liveSessions[chainId]),
      publicSessions,
      recoverPasskeyWallet,
      refreshSession,
      revokeHiringSession,
      walletAddress: storedWallet?.address ?? null,
    }),
    [
      approveExactHiringBudget,
      createPasskeyWallet,
      executeSessionHire,
      grantHiringSession,
      liveSessions,
      publicSessions,
      recoverPasskeyWallet,
      refreshSession,
      revokeHiringSession,
      storedWallet?.address,
    ],
  );

  return (
    <AltanaSessionContext.Provider value={value}>
      {children}
    </AltanaSessionContext.Provider>
  );
}

export function useAltanaSession(): AltanaContextValue {
  const context = useContext(AltanaSessionContext);
  if (!context) {
    throw new Error("useAltanaSession must be used inside AltanaSessionProvider.");
  }
  return context;
}
