import { bsc, bscTestnet, type Chain } from "viem/chains";

export const supportedBnbNetworks = ["bsc-testnet", "bsc-mainnet"] as const;
export type SupportedBnbNetwork = (typeof supportedBnbNetworks)[number];

type PublicBnbChainDefinition = Readonly<{
  chain: Chain;
  chainId: number;
  publicRpcUrls: readonly [string, string, string];
}>;

export const publicBnbChainDefinitions: Readonly<
  Record<SupportedBnbNetwork, PublicBnbChainDefinition>
> = {
  "bsc-testnet": {
    chain: bscTestnet,
    chainId: bscTestnet.id,
    publicRpcUrls: [
      "https://bsc-prebsc-dataseed.bnbchain.org",
      "https://bsc-testnet-rpc.publicnode.com",
      "https://bsc-testnet.drpc.org",
    ],
  },
  "bsc-mainnet": {
    chain: bsc,
    chainId: bsc.id,
    publicRpcUrls: [
      "https://bsc-rpc.publicnode.com",
      "https://bsc-mainnet.gateway.tatum.io",
      "https://1rpc.io/bnb",
    ],
  },
};

export const defaultWalletChain = bscTestnet;
export const supportedWalletChains = [bscTestnet, bsc] as const;
export type SupportedWalletChainId =
  (typeof supportedWalletChains)[number]["id"];

export function isSupportedWalletChainId(
  value: unknown,
): value is SupportedWalletChainId {
  return (
    typeof value === "number" &&
    supportedWalletChains.some((chain) => chain.id === value)
  );
}

export function getSupportedWalletChain(
  chainId: unknown,
): (typeof supportedWalletChains)[number] | null {
  return isSupportedWalletChainId(chainId)
    ? (supportedWalletChains.find((chain) => chain.id === chainId) ?? null)
    : null;
}
