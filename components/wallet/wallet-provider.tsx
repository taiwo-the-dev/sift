"use client";

import {
  darkTheme,
  RainbowKitProvider,
  type Theme,
} from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";
import { WagmiProvider } from "wagmi";

import { AltanaSessionProvider } from "@/components/altana/altana-session-provider";
import { defaultWalletChain } from "@/lib/blockchain/chains";
import { getWalletConfig } from "@/lib/blockchain/wallet-config";

const siftWalletTheme: Theme = {
  ...darkTheme({
    accentColor: "#f0b90b",
    accentColorForeground: "#090b0d",
    borderRadius: "medium",
    fontStack: "system",
    overlayBlur: "small",
  }),
  colors: {
    ...darkTheme().colors,
    accentColor: "#f0b90b",
    accentColorForeground: "#090b0d",
    modalBackground: "#11151a",
    modalBorder: "#2b323a",
  },
};

export function WalletProvider({ children }: Readonly<PropsWithChildren>) {
  const [config] = useState(getWalletConfig);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
            staleTime: 30_000,
          },
        },
      }),
  );

  return (
    <WagmiProvider config={config} reconnectOnMount>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          initialChain={defaultWalletChain}
          modalSize="compact"
          theme={siftWalletTheme}
        >
          <AltanaSessionProvider>{children}</AltanaSessionProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
