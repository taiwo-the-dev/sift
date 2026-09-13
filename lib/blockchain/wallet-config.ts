import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createConfig, fallback, http, type Config } from "wagmi";
import { injected } from "wagmi/connectors";

import { readPublicWalletEnvironment } from "@/features/wallet/config";
import { deduplicateConnectorsById } from "@/features/wallet/connectors";
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

function enforceUniqueConnectorIds<TConfig extends Config>(
  config: TConfig,
): TConfig {
  const removeDuplicates = (connectors: typeof config.connectors) => {
    const uniqueConnectors = deduplicateConnectorsById(connectors);

    if (uniqueConnectors.length !== connectors.length) {
      // RainbowKit keys wallet options by connector ID. Some EIP-6963 browser
      // extensions announce the same RDNS identity more than once, so keep the
      // first connector before the duplicated options reach React.
      config._internal.connectors.setState(uniqueConnectors);
    }
  };

  removeDuplicates(config.connectors);
  config._internal.connectors.subscribe(removeDuplicates);

  return config;
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
    return enforceUniqueConnectorIds(
      getDefaultConfig({
        ...applicationMetadata,
        chains: supportedWalletChains,
        projectId: environment.walletConnectProjectId,
        ssr: true,
        transports,
      }),
    );
  }

  return enforceUniqueConnectorIds(
    createConfig({
      chains: supportedWalletChains,
      connectors: [injected()],
      ssr: true,
      transports,
    }),
  );
}

export function isWalletConnectConfigured(): boolean {
  return readPublicWalletEnvironment().walletConnectProjectId !== null;
}
