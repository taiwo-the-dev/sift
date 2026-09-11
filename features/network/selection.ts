import type { SupportedBnbNetwork } from "@/lib/blockchain/chains";

export const catalogueNetworkCookie = "sift_catalogue_network";
export const defaultCatalogueNetwork: SupportedBnbNetwork = "bsc-mainnet";

export const catalogueNetworkOptions = [
  {
    chainId: 56,
    label: "BSC Mainnet",
    shortLabel: "Mainnet",
    value: "bsc-mainnet",
  },
  {
    chainId: 97,
    label: "BSC Testnet",
    shortLabel: "Testnet",
    value: "bsc-testnet",
  },
] as const satisfies readonly Readonly<{
  chainId: 56 | 97;
  label: string;
  shortLabel: string;
  value: SupportedBnbNetwork;
}>[];

export function parseCatalogueNetwork(
  value: unknown,
): SupportedBnbNetwork | null {
  return typeof value === "string" &&
    catalogueNetworkOptions.some((option) => option.value === value)
    ? (value as SupportedBnbNetwork)
    : null;
}

export function catalogueNetworkForChainId(
  chainId: unknown,
): SupportedBnbNetwork | null {
  return catalogueNetworkOptions.find((option) => option.chainId === chainId)
    ?.value ?? null;
}

export function catalogueChainId(
  network: SupportedBnbNetwork,
): 56 | 97 {
  return catalogueNetworkOptions.find((option) => option.value === network)
    ?.chainId ?? 56;
}
