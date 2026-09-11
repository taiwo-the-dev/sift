import "server-only";

import { formatUnits, getAddress, isAddress } from "viem";

import { inspectX402Service } from "@/features/activation/protocol";
import {
  challengeForRequirement,
  selectX402Requirement,
  x402AmountFor,
  type BnbX402Challenge,
  type X402OptionPreference,
} from "@/features/activation/x402";
import { getHiringPublicClient } from "@/lib/blockchain/hiring-client";
import type { Json } from "@/lib/db/database.types";

const tokenAbi = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export type PreparedX402Payment = Readonly<{
  challenge: BnbX402Challenge;
  kind: "payment";
  quote: Readonly<{
    amount: string;
    amountAtomic: string;
    asset: `0x${string}`;
    balance: string;
    balanceAtomic: string;
    chainId: 56 | 97;
    description: string | null;
    hasEnoughBalance: boolean;
    maxTimeoutSeconds: number;
    network: string;
    payTo: `0x${string}`;
    protocolVersion: 1 | 2;
    symbol: string;
  }>;
}>;

export type FreeX402Resource = Readonly<{
  kind: "free";
  resource: Json;
}>;

export async function prepareX402Payment(input: Readonly<{
  chainId: number;
  endpoint: string;
  preference?: X402OptionPreference;
  walletAddress: string;
}>): Promise<PreparedX402Payment | FreeX402Resource> {
  if (
    (input.chainId !== 56 && input.chainId !== 97) ||
    !isAddress(input.walletAddress)
  ) {
    throw new TypeError("Connect a wallet on a supported BNB network.");
  }
  const chainId: 56 | 97 = input.chainId;
  const inspection = await inspectX402Service(input.endpoint, chainId, {
    maxBytes: 65_536,
    timeoutMs: 12_000,
  });
  if (inspection.free) {
    return { kind: "free", resource: inspection.resource };
  }
  if (!inspection.challenge) {
    throw new TypeError("The provider did not return a payment request.");
  }

  const requirement = selectX402Requirement(
    inspection.challenge,
    input.preference,
  );
  const amount = BigInt(x402AmountFor(requirement));
  const asset = getAddress(requirement.asset);
  const payTo = getAddress(requirement.payTo);
  const walletAddress = getAddress(input.walletAddress);
  const client = getHiringPublicClient(chainId);
  const [decimals, symbol, balance] = await Promise.all([
    client.readContract({ address: asset, abi: tokenAbi, functionName: "decimals" }),
    client.readContract({ address: asset, abi: tokenAbi, functionName: "symbol" }),
    client.readContract({
      address: asset,
      abi: tokenAbi,
      args: [walletAddress],
      functionName: "balanceOf",
    }),
  ]);
  if (
    !Number.isSafeInteger(decimals) ||
    decimals < 0 ||
    decimals > 255 ||
    typeof symbol !== "string" ||
    !symbol.trim() ||
    symbol.length > 32
  ) {
    throw new TypeError("Sift could not verify the requested payment token.");
  }

  return {
    challenge: challengeForRequirement(inspection.challenge, requirement),
    kind: "payment",
    quote: {
      amount: formatUnits(amount, decimals),
      amountAtomic: amount.toString(),
      asset,
      balance: formatUnits(balance, decimals),
      balanceAtomic: balance.toString(),
      chainId,
      description: requirement.description || null,
      hasEnoughBalance: balance >= amount,
      maxTimeoutSeconds: requirement.maxTimeoutSeconds,
      network: requirement.network,
      payTo,
      protocolVersion: inspection.challenge.x402Version,
      symbol: symbol.trim(),
    },
  };
}
