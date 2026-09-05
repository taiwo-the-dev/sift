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
  erc8183Deployment,
  evaluatorRouterAbi,
  optimisticPolicyAbi,
  paymentTokenAbi,
} from "@/features/hiring/protocol";
import { HiringQuoteError } from "@/features/hiring/quote";
import { resolveHiringRpcUrls } from "@/features/hiring/rpc";
import { publicBnbChainDefinitions } from "@/lib/blockchain/chains";

let cachedClient: PublicClient | undefined;

export function getHiringPublicClient(): PublicClient {
  if (cachedClient) {
    return cachedClient;
  }

  const definition = publicBnbChainDefinitions["bsc-testnet"];
  const urls = resolveHiringRpcUrls(definition.publicRpcUrls, process.env);

  cachedClient = createPublicClient({
    chain: definition.chain,
    transport: fallback(
      urls.map((url) => http(url, { retryCount: 0, timeout: 10_000 })),
      { rank: false, retryCount: 0 },
    ),
  });

  return cachedClient;
}

export type Erc8183RuntimeState = Readonly<{
  blockTimestamp: number;
  disputeWindowSeconds: number;
  platformFeeBasisPoints: number;
}>;

export async function verifyErc8183Runtime(
  client: PublicClient = getHiringPublicClient(),
): Promise<Erc8183RuntimeState> {
  const chainId = await client.getChainId();

  if (chainId !== erc8183Deployment.chainId) {
    throw new HiringQuoteError(
      "protocol-unavailable",
      "The configured hiring RPC is not connected to BSC Testnet.",
    );
  }

  const [commerceCode, routerCode, policyCode, tokenCode] = await Promise.all([
    client.getBytecode({ address: erc8183Deployment.commerce }),
    client.getBytecode({ address: erc8183Deployment.router }),
    client.getBytecode({ address: erc8183Deployment.policy }),
    client.getBytecode({ address: erc8183Deployment.paymentToken }),
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
      address: erc8183Deployment.commerce,
      abi: commerceAbi,
      functionName: "paymentToken",
    }),
    client.readContract({
      address: erc8183Deployment.commerce,
      abi: commerceAbi,
      functionName: "platformFeeBP",
    }),
    client.readContract({
      address: erc8183Deployment.commerce,
      abi: commerceAbi,
      functionName: "paused",
    }),
    client.readContract({
      address: erc8183Deployment.router,
      abi: evaluatorRouterAbi,
      functionName: "commerce",
    }),
    client.readContract({
      address: erc8183Deployment.router,
      abi: evaluatorRouterAbi,
      functionName: "policyWhitelist",
      args: [erc8183Deployment.policy],
    }),
    client.readContract({
      address: erc8183Deployment.router,
      abi: evaluatorRouterAbi,
      functionName: "paused",
    }),
    client.readContract({
      address: erc8183Deployment.policy,
      abi: optimisticPolicyAbi,
      functionName: "commerce",
    }),
    client.readContract({
      address: erc8183Deployment.policy,
      abi: optimisticPolicyAbi,
      functionName: "router",
    }),
    client.readContract({
      address: erc8183Deployment.policy,
      abi: optimisticPolicyAbi,
      functionName: "disputeWindow",
    }),
    client.readContract({
      address: erc8183Deployment.paymentToken,
      abi: paymentTokenAbi,
      functionName: "decimals",
    }),
    client.readContract({
      address: erc8183Deployment.paymentToken,
      abi: paymentTokenAbi,
      functionName: "symbol",
    }),
    client.getBlock(),
  ]);

  if (
    getAddress(paymentToken) !== erc8183Deployment.paymentToken ||
    getAddress(routerCommerce) !== erc8183Deployment.commerce ||
    getAddress(policyCommerce) !== erc8183Deployment.commerce ||
    getAddress(policyRouter) !== erc8183Deployment.router ||
    !policyWhitelisted ||
    commercePaused ||
    routerPaused ||
    tokenDecimals !== erc8183Deployment.tokenDecimals ||
    tokenSymbol !== erc8183Deployment.tokenSymbol ||
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
