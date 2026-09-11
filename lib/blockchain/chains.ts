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
      // NodeReal documents this credential as its public, shareable BSC
      // Testnet key. Unlike the prior full-node fallback, it currently serves
      // the historical log range required by the incremental indexer.
      "https://bsc-testnet.nodereal.io/v1/e9a36765eb8a40b9bd12e680a1fd2bc5",
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

export const defaultWalletChain = bsc;
export const supportedWalletChains = [bsc, bscTestnet] as const;
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
