const evmAddressPattern = /^0x[0-9a-fA-F]{40}$/;
const blockedHostnameSuffixes = [".internal", ".local", ".localhost"] as const;
const maximumExternalUrlLength = 2_048;

const explorerOrigins = new Map<number, string>([
  [56, "https://bscscan.com"],
  [97, "https://testnet.bscscan.com"],
]);

function isIpLiteral(hostname: string): boolean {
  return (
    /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) ||
    hostname.includes(":")
  );
}

export function normalizeExternalHref(value: string | null): string | null {
  const candidate = value?.trim();

  if (!candidate || candidate.length > maximumExternalUrlLength) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    hostname === "localhost" ||
    blockedHostnameSuffixes.some((suffix) => hostname.endsWith(suffix)) ||
    isIpLiteral(hostname)
  ) {
    return null;
  }

  return url.toString();
}

export function buildExplorerAddressHref(
  chainId: number,
  address: string | null,
): string | null {
  const origin = explorerOrigins.get(chainId);

  if (!origin || !address || !evmAddressPattern.test(address)) {
    return null;
  }

  return `${origin}/address/${address.toLowerCase()}`;
}

export function buildExplorerBlockHref(
  chainId: number,
  blockNumber: number | null,
): string | null {
  const origin = explorerOrigins.get(chainId);

  if (
    !origin ||
    blockNumber === null ||
    !Number.isSafeInteger(blockNumber) ||
    blockNumber < 0
  ) {
    return null;
  }

  return `${origin}/block/${blockNumber}`;
}
