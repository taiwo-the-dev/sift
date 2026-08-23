import { publicBnbChainDefinitions } from "@/lib/blockchain/chains";

type PublicWalletEnvironmentSource = Readonly<{
  NEXT_PUBLIC_BNB_MAINNET_RPC_URL?: string;
  NEXT_PUBLIC_BNB_TESTNET_RPC_URL?: string;
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID?: string;
}>;

export type PublicWalletEnvironment = Readonly<{
  mainnetRpcUrls: readonly [string, ...string[]];
  testnetRpcUrls: readonly [string, ...string[]];
  walletConnectProjectId: string | null;
}>;

export class PublicWalletConfigError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PublicWalletConfigError";
  }
}

function optionalValue(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  return candidate ? candidate : undefined;
}

function parsePublicRpcUrl(value: string | undefined, name: string): string | null {
  const candidate = optionalValue(value);

  if (!candidate) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(candidate);
  } catch (error) {
    throw new PublicWalletConfigError(`${name} must be a valid HTTPS URL.`, {
      cause: error,
    });
  }

  if (
    url.protocol !== "https:" ||
    !url.hostname ||
    url.username ||
    url.password ||
    candidate.length > 2_048
  ) {
    throw new PublicWalletConfigError(
      `${name} must be a public HTTPS URL without embedded credentials.`,
    );
  }

  return url.toString().replace(/\/$/, "");
}

function rpcFallbacks(
  configuredUrl: string | null,
  defaults: readonly [string, string, string],
): [string, ...string[]] {
  const values = configuredUrl ? [configuredUrl, ...defaults] : [...defaults];
  return [...new Set(values)] as [string, ...string[]];
}

function parseWalletConnectProjectId(value: string | undefined): string | null {
  const candidate = optionalValue(value);

  if (!candidate) {
    return null;
  }

  if (!/^[a-fA-F0-9]{32}$/.test(candidate)) {
    throw new PublicWalletConfigError(
      "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID must be a 32-character hexadecimal WalletConnect project ID.",
    );
  }

  return candidate;
}

export function parsePublicWalletEnvironment(
  source: PublicWalletEnvironmentSource,
): PublicWalletEnvironment {
  const testnetRpcUrl = parsePublicRpcUrl(
    source.NEXT_PUBLIC_BNB_TESTNET_RPC_URL,
    "NEXT_PUBLIC_BNB_TESTNET_RPC_URL",
  );
  const mainnetRpcUrl = parsePublicRpcUrl(
    source.NEXT_PUBLIC_BNB_MAINNET_RPC_URL,
    "NEXT_PUBLIC_BNB_MAINNET_RPC_URL",
  );

  return Object.freeze({
    mainnetRpcUrls: rpcFallbacks(
      mainnetRpcUrl,
      publicBnbChainDefinitions["bsc-mainnet"].publicRpcUrls,
    ),
    testnetRpcUrls: rpcFallbacks(
      testnetRpcUrl,
      publicBnbChainDefinitions["bsc-testnet"].publicRpcUrls,
    ),
    walletConnectProjectId: parseWalletConnectProjectId(
      source.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    ),
  });
}

export function readPublicWalletEnvironment(): PublicWalletEnvironment {
  return parsePublicWalletEnvironment({
    NEXT_PUBLIC_BNB_MAINNET_RPC_URL:
      process.env.NEXT_PUBLIC_BNB_MAINNET_RPC_URL,
    NEXT_PUBLIC_BNB_TESTNET_RPC_URL:
      process.env.NEXT_PUBLIC_BNB_TESTNET_RPC_URL,
    NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID:
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  });
}
