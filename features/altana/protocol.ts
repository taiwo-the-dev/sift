import type {
  Call,
  SessionPermissions,
} from "@altananetwork/sdk";
import {
  encodeFunctionData,
  formatEther,
  getAddress,
  keccak256,
  toFunctionSelector,
  type Address,
  type Hash,
  type Hex,
} from "viem";

import {
  getErc8183Deployment,
  type HiringChainId,
} from "@/features/hiring/protocol";

export const ALTANA_SDK_VERSION = "0.7.1";
export const ALTANA_DEFAULT_SESSION_SECONDS = 3_600;
export const ALTANA_NATIVE_GAS_CAP_WEI = 20_000_000_000_000_000n;

export type AltanaExecutionResult = Readonly<{
  callsId: Hex;
  status: "PENDING" | "CONFIRMED" | "FAILED";
  transactionHash?: Hash;
}>;

export type AltanaNetwork = Readonly<{
  chainId: HiringChainId;
  explorerBaseUrl: string;
  keyStore: Address;
  keyStoreController: Address;
  networkName: "BSC Mainnet" | "BSC Testnet";
  registry: Address;
  sdkBundledPolicy: Address;
}>;

export type AltanaSdkNetworkSnapshot = Readonly<{
  chainId: HiringChainId;
  commerce: Address;
  keyStore: Address;
  keyStoreController: Address;
  paymentToken: Address;
  policy: Address;
  registry: Address;
  router: Address;
}>;

/**
 * Reviewed against @altananetwork/sdk 0.7.1 on 2026-09-07. Runtime loading
 * rejects the integration if the installed SDK disagrees with these values.
 */
export const altanaNetworks: Readonly<Record<HiringChainId, AltanaNetwork>> =
  Object.freeze({
    56: Object.freeze({
      chainId: 56,
      explorerBaseUrl: "https://bscscan.com",
      keyStore: getAddress("0x6572427ED530BadcF7375Cf9A4709D8d2b0E7E0a"),
      keyStoreController: getAddress(
        "0x0834Ee2C9BdC3E3efF0a2dC34393D4B0e546A555",
      ),
      networkName: "BSC Mainnet",
      registry: getAddress("0x8004A169FB4a3325136EB29fA0ceB6D2e539a432"),
      sdkBundledPolicy: getAddress("0x9C01845705b3078Aa2e8cfF7520a6376FD766dE5"),
    }),
    97: Object.freeze({
      chainId: 97,
      explorerBaseUrl: "https://testnet.bscscan.com",
      keyStore: getAddress("0x6b8361C29d05D498b1a12B54A37310f94171E94A"),
      keyStoreController: getAddress(
        "0xb530D1971f5453F3359518343F05D0AedFfF7e12",
      ),
      networkName: "BSC Testnet",
      registry: getAddress("0x8004A818BFB912233c491871b3d84c89A494BD9e"),
      sdkBundledPolicy: getAddress("0x4F4678D4439feC812Ac7674Bb3Efb4C8f5Fb78A6"),
    }),
  });

export const altanaKeyStoreAbi = [
  {
    type: "function",
    name: "isValidKey",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "keyId", type: "bytes32" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "getPublicKey",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "keyId", type: "bytes32" },
    ],
    outputs: [{ type: "bytes" }],
  },
] as const;

export const commerceJobCounterAbi = [
  {
    type: "function",
    name: "jobCounter",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
] as const;

export function getAltanaNetwork(chainId: HiringChainId): AltanaNetwork {
  return altanaNetworks[chainId];
}

export function assertAltanaSdkNetwork(
  sdkNetwork: AltanaSdkNetworkSnapshot,
): void {
  const reviewedAltana = getAltanaNetwork(sdkNetwork.chainId);
  const reviewedErc8183 = getErc8183Deployment(sdkNetwork.chainId);
  if (
    getAddress(sdkNetwork.keyStore) !== reviewedAltana.keyStore ||
    getAddress(sdkNetwork.keyStoreController) !== reviewedAltana.keyStoreController ||
    getAddress(sdkNetwork.commerce) !== reviewedErc8183.commerce ||
    getAddress(sdkNetwork.router) !== reviewedErc8183.router ||
    getAddress(sdkNetwork.policy) !== reviewedAltana.sdkBundledPolicy ||
    getAddress(sdkNetwork.registry) !== reviewedAltana.registry ||
    getAddress(sdkNetwork.paymentToken) !== reviewedErc8183.paymentToken
  ) {
    throw new Error(
      `Altana SDK ${ALTANA_SDK_VERSION} does not match Sift's reviewed chain ${sdkNetwork.chainId} boundary.`,
    );
  }
}

export function altanaKeyId(publicKey: Hex): Hex {
  return keccak256(publicKey);
}

export function buildAltanaTransactionHref(
  chainId: HiringChainId,
  hash: Hash,
): string {
  return `${getAltanaNetwork(chainId).explorerBaseUrl}/tx/${hash}`;
}

export function buildAltanaKeyStoreHref(chainId: HiringChainId): string {
  return `${getAltanaNetwork(chainId).explorerBaseUrl}/address/${getAltanaNetwork(chainId).keyStore}`;
}

export function formatAltanaGasCap(value: bigint): string {
  return `${formatEther(value)} BNB per day`;
}

/**
 * Least-privilege permissions for one Sift buyer session. ERC-20 approve is
 * deliberately absent because an allowance can outlive session revocation.
 * Sift provisions only the exact Commerce allowance through the passkey admin.
 */
export function buildAltanaBuyerPermissions(
  chainId: HiringChainId,
  tokenCap: bigint,
  nativeGasCap = ALTANA_NATIVE_GAS_CAP_WEI,
): SessionPermissions {
  if (tokenCap < 0n) {
    throw new TypeError("The Altana token cap cannot be negative.");
  }

  if (nativeGasCap <= 0n || nativeGasCap > ALTANA_NATIVE_GAS_CAP_WEI) {
    throw new TypeError("The Altana gas cap is outside Sift's supported range.");
  }

  const deployment = getErc8183Deployment(chainId);
  return {
    calls: [
      {
        to: deployment.commerce,
        signature: "createJob(address,address,uint256,string,address)",
      },
      {
        to: deployment.commerce,
        signature: "setBudget(uint256,uint256,bytes)",
      },
      {
        to: deployment.commerce,
        signature: "fund(uint256,uint256,bytes)",
      },
      {
        to: deployment.router,
        signature: "registerJob(uint256,address)",
      },
    ],
    spend: [
      ...(tokenCap > 0n
        ? [
            {
              limit: tokenCap,
              period: "day" as const,
              token: deployment.paymentToken,
            },
          ]
        : []),
      { limit: nativeGasCap, period: "day" as const },
    ],
  };
}

export function buildExactCommerceApprovalCall(
  chainId: HiringChainId,
  budget: bigint,
): Call {
  if (budget < 0n) {
    throw new TypeError("The hiring budget cannot be negative.");
  }

  const deployment = getErc8183Deployment(chainId);
  return {
    data: encodeFunctionData({
      abi: [
        {
          type: "function",
          name: "approve",
          stateMutability: "nonpayable",
          inputs: [
            { name: "spender", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ type: "bool" }],
        },
      ] as const,
      functionName: "approve",
      args: [deployment.commerce, budget],
    }),
    to: deployment.paymentToken,
    value: 0n,
  };
}

export function requiresExactCommerceApproval(
  currentAllowance: bigint,
  budget: bigint,
): boolean {
  if (currentAllowance < 0n || budget < 0n) {
    throw new TypeError("Token allowances and hiring budgets cannot be negative.");
  }
  return budget > 0n && currentAllowance !== budget;
}

export function removeUnsafeApprovalCall(
  calls: readonly Call[],
  chainId: HiringChainId,
): readonly Call[] {
  const deployment = getErc8183Deployment(chainId);
  const approvalCalls = calls.filter(
    (call) => getAddress(call.to) === deployment.paymentToken,
  );
  const protectedCalls = calls.filter(
    (call) => getAddress(call.to) !== deployment.paymentToken,
  );
  const expected = [
    [deployment.commerce, "createJob(address,address,uint256,string,address)"],
    [deployment.router, "registerJob(uint256,address)"],
    [deployment.commerce, "setBudget(uint256,uint256,bytes)"],
    [deployment.paymentToken, "approve(address,uint256)"],
    [deployment.commerce, "fund(uint256,uint256,bytes)"],
  ] as const;
  const matchesReviewedSequence = calls.every((call, index) => {
    const expectedCall = expected[index];
    return Boolean(
      expectedCall &&
        getAddress(call.to) === expectedCall[0] &&
        call.data?.slice(0, 10).toLowerCase() ===
          toFunctionSelector(expectedCall[1]).toLowerCase() &&
        (call.value === undefined || call.value === 0n),
    );
  });

  if (
    calls.length !== 5 ||
    approvalCalls.length !== 1 ||
    protectedCalls.length !== 4 ||
    !matchesReviewedSequence
  ) {
    throw new Error(
      "The official Altana ERC-8183 call bundle no longer matches Sift's reviewed sequence.",
    );
  }

  return protectedCalls;
}
