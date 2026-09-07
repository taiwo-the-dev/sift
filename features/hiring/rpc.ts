import type { HiringChainId } from "@/features/hiring/protocol";

export type HiringRpcEnvironment = Readonly<Record<string, string | undefined>>;

function parseRpcOverride(value: string | undefined): string | null {
  const normalized = value?.trim();

  if (!normalized) return null;

  try {
    const url = new URL(normalized);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !url.hostname
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function resolveHiringRpcUrls(
  chainId: HiringChainId,
  publicFallbacks: readonly string[],
  environment: HiringRpcEnvironment,
): readonly string[] {
  const prefix = chainId === 56 ? "BNB_MAINNET_RPC" : "BNB_TESTNET_RPC";
  const overrides = [
    environment[`${prefix}_PRIMARY`],
    environment[`${prefix}_FALLBACK_1`],
    environment[`${prefix}_FALLBACK_2`],
  ].map(parseRpcOverride);

  return publicFallbacks.map(
    (defaultUrl, index) => overrides[index] ?? defaultUrl,
  );
}
