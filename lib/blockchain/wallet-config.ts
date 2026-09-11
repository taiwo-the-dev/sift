import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createConfig, fallback, http } from "wagmi";
import { injected } from "wagmi/connectors";

import { readPublicWalletEnvironment } from "@/features/wallet/config";
import { supportedWalletChains } from "@/lib/blockchain/chains";

const applicationMetadata = {
  appDescription:
    "Discover and compare ERC-8004 AI agents registered on BNB Chain.",
  appName: "Sift",
} as const;

function browserTransport(urls: readonly [string, ...string[]]) {
  return fallback(
    urls.map((url) =>
      http(url, {
        retryCount: 0,
        timeout: 8_000,
      }),
    ),
    {
      rank: false,
      retryCount: 0,
    },
  );
}

export function getWalletConfig() {
  const environment = readPublicWalletEnvironment();
  const transports = {
    [supportedWalletChains[0].id]: browserTransport(
      environment.mainnetRpcUrls,
    ),
    [supportedWalletChains[1].id]: browserTransport(
      environment.testnetRpcUrls,
    ),
  };

  if (environment.walletConnectProjectId) {
    return getDefaultConfig({
      ...applicationMetadata,
      chains: supportedWalletChains,
      projectId: environment.walletConnectProjectId,
      ssr: true,
      transports,
    });
  }

  return createConfig({
    chains: supportedWalletChains,
    connectors: [injected()],
    ssr: true,
    transports,
  });
}

export function isWalletConnectConfigured(): boolean {
  return readPublicWalletEnvironment().walletConnectProjectId !== null;
}
