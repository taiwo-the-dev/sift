import "server-only";

import {
  createPublicClient,
  fallback,
  getAddress,
  http,
  type PublicClient,
} from "viem";

import {
  commerceAbi,
  evaluatorRouterAbi,
  getErc8183Deployment,
  optimisticPolicyAbi,
  paymentTokenAbi,
  type HiringChainId,
} from "@/features/hiring/protocol";
import { HiringQuoteError } from "@/features/hiring/quote";
import { resolveHiringRpcUrls } from "@/features/hiring/rpc";
import { publicBnbChainDefinitions } from "@/lib/blockchain/chains";

const cachedClients = new Map<HiringChainId, PublicClient>();

export function getHiringPublicClient(chainId: HiringChainId): PublicClient {
  const cached = cachedClients.get(chainId);

  if (cached) {
    return cached;
  }

  const deployment = getErc8183Deployment(chainId);
  const definition = publicBnbChainDefinitions[deployment.network];
  const urls = resolveHiringRpcUrls(chainId, definition.publicRpcUrls, process.env);

  const client = createPublicClient({
    chain: definition.chain,
    transport: fallback(
      urls.map((url) => http(url, { retryCount: 0, timeout: 10_000 })),
      { rank: false, retryCount: 0 },
    ),
  });

  cachedClients.set(chainId, client as PublicClient);
  return client as PublicClient;
}

export type Erc8183RuntimeState = Readonly<{
  blockTimestamp: number;
  disputeWindowSeconds: number;
  platformFeeBasisPoints: number;
}>;

export async function verifyErc8183Runtime(
  expectedChainId: HiringChainId,
  client: PublicClient = getHiringPublicClient(expectedChainId),
): Promise<Erc8183RuntimeState> {
  const deployment = getErc8183Deployment(expectedChainId);
  const chainId = await client.getChainId();

  if (chainId !== deployment.chainId) {
    throw new HiringQuoteError(
      "protocol-unavailable",
      `The configured hiring RPC is not connected to ${deployment.networkName}.`,
    );
  }

  const [commerceCode, routerCode, policyCode, tokenCode] = await Promise.all([
    client.getBytecode({ address: deployment.commerce }),
    client.getBytecode({ address: deployment.router }),
    client.getBytecode({ address: deployment.policy }),
    client.getBytecode({ address: deployment.paymentToken }),
  ]);

  if (
    [commerceCode, routerCode, policyCode, tokenCode].some(
      (code) => !code || code === "0x",
    )
  ) {
    throw new HiringQuoteError(
      "protocol-unavailable",
      "One or more verified ERC-8183 contracts are not available on the configured RPC.",
    );
  }

  const [
    paymentToken,
    platformFee,
    commercePaused,
    routerCommerce,
    policyWhitelisted,
    routerPaused,
    policyCommerce,
    policyRouter,
    disputeWindow,
    tokenDecimals,
    tokenSymbol,
    block,
  ] = await Promise.all([
    client.readContract({
      address: deployment.commerce,
      abi: commerceAbi,
      functionName: "paymentToken",
    }),
    client.readContract({
      address: deployment.commerce,
      abi: commerceAbi,
      functionName: "platformFeeBP",
    }),
    client.readContract({
      address: deployment.commerce,
      abi: commerceAbi,
      functionName: "paused",
    }),
    client.readContract({
      address: deployment.router,
      abi: evaluatorRouterAbi,
      functionName: "commerce",
    }),
    client.readContract({
      address: deployment.router,
      abi: evaluatorRouterAbi,
      functionName: "policyWhitelist",
      args: [deployment.policy],
    }),
    client.readContract({
      address: deployment.router,
      abi: evaluatorRouterAbi,
      functionName: "paused",
    }),
    client.readContract({
      address: deployment.policy,
      abi: optimisticPolicyAbi,
      functionName: "commerce",
    }),
    client.readContract({
      address: deployment.policy,
      abi: optimisticPolicyAbi,
      functionName: "router",
    }),
    client.readContract({
      address: deployment.policy,
      abi: optimisticPolicyAbi,
      functionName: "disputeWindow",
    }),
    client.readContract({
      address: deployment.paymentToken,
      abi: paymentTokenAbi,
      functionName: "decimals",
    }),
    client.readContract({
      address: deployment.paymentToken,
      abi: paymentTokenAbi,
      functionName: "symbol",
    }),
    client.getBlock(),
  ]);

  if (
    getAddress(paymentToken) !== deployment.paymentToken ||
    getAddress(routerCommerce) !== deployment.commerce ||
    getAddress(policyCommerce) !== deployment.commerce ||
    getAddress(policyRouter) !== deployment.router ||
    !policyWhitelisted ||
    commercePaused ||
    routerPaused ||
    tokenDecimals !== deployment.tokenDecimals ||
    tokenSymbol !== deployment.tokenSymbol ||
    platformFee > 1_000n ||
    disputeWindow <= 0n ||
    disputeWindow > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    throw new HiringQuoteError(
      "protocol-unavailable",
      "The live ERC-8183 deployment no longer matches Sift's verified safety configuration.",
    );
  }

  return {
    blockTimestamp: Number(block.timestamp),
    disputeWindowSeconds: Number(disputeWindow),
    platformFeeBasisPoints: Number(platformFee),
  };
}
