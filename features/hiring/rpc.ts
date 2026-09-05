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
  publicFallbacks: readonly string[],
  environment: HiringRpcEnvironment,
): readonly string[] {
  const overrides = [
    environment.BNB_TESTNET_RPC_PRIMARY,
    environment.BNB_TESTNET_RPC_FALLBACK_1,
    environment.BNB_TESTNET_RPC_FALLBACK_2,
  ].map(parseRpcOverride);

  return publicFallbacks.map(
    (defaultUrl, index) => overrides[index] ?? defaultUrl,
  );
}
