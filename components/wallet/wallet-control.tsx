"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { useAccount, useConnectors, useSwitchChain } from "wagmi";

import {
  WalletControlView,
  type WalletConnectionView,
} from "@/components/wallet/wallet-control-view";
import {
  describeWalletChain,
  mapWalletError,
  shortenWalletAddress,
  type WalletErrorMessage,
} from "@/features/wallet/presentation";
import {
  defaultWalletChain,
  getSupportedWalletChain,
} from "@/lib/blockchain/chains";
import { isWalletConnectConfigured } from "@/lib/blockchain/wallet-config";

interface WalletControlProps {
  mobile?: boolean;
  onBeforeWalletAction?: () => void;
}

type RainbowControl = Readonly<{
  mounted: boolean;
  openAccountModal: () => void;
  openChainModal: () => void;
  openConnectModal: () => void;
}>;

function WalletControlInner({
  mobile,
  onBeforeWalletAction,
  rainbow,
}: Readonly<{
  mobile: boolean;
  onBeforeWalletAction?: () => void;
  rainbow: RainbowControl;
}>) {
  const account = useAccount();
  const connectors = useConnectors();
  const switchChain = useSwitchChain();
  const [noticeState, setNoticeState] = useState<Readonly<{
    contextKey: string;
    message: WalletErrorMessage;
  }> | null>(null);
  const walletConnectConfigured = isWalletConnectConfigured();

  const chain = getSupportedWalletChain(account.chainId);
  const contextKey = `${account.status}:${account.address ?? ""}:${account.chainId ?? ""}`;
  const providerWindow =
    rainbow.mounted && typeof window !== "undefined"
      ? (window as Window & { ethereum?: unknown })
      : null;
  const discoveredConnector = connectors.some(
    (connector) => connector.id !== "injected" || connector.name !== "Injected",
  );
  const providerAvailable = !rainbow.mounted
    ? undefined
    : walletConnectConfigured ||
      Boolean(providerWindow?.ethereum) ||
      discoveredConnector;
  const notice =
    noticeState?.contextKey === contextKey ? noticeState.message : null;
  const connection = !rainbow.mounted
    ? "hydrating"
    : account.status;
  const view: WalletConnectionView = {
    addressLabel: shortenWalletAddress(account.address) ?? undefined,
    chainName:
      describeWalletChain(account.chainId) ??
      account.chain?.name ??
      "Unsupported network",
    connection,
    notice,
    providerAvailable,
    switching: switchChain.isPending,
    supportedChain: account.status === "connected" ? chain !== null : undefined,
  };

  function connectWallet(): void {
    setNoticeState(null);

    if (providerAvailable === false) {
      setNoticeState({
        contextKey,
        message: mapWalletError(new Error("ProviderNotFoundError")),
      });
      return;
    }

    onBeforeWalletAction?.();
    rainbow.openConnectModal();
  }

  function switchToTestnet(): void {
    setNoticeState(null);
    onBeforeWalletAction?.();
    switchChain.switchChain(
      { chainId: defaultWalletChain.id },
      {
        onError(error) {
          setNoticeState({ contextKey, message: mapWalletError(error) });
        },
        onSuccess() {
          setNoticeState(null);
        },
      },
    );
  }

  return (
    <WalletControlView
      mobile={mobile}
      view={view}
      onConnect={connectWallet}
      onDismissNotice={() => setNoticeState(null)}
      onOpenAccount={() => {
        onBeforeWalletAction?.();
        rainbow.openAccountModal();
      }}
      onOpenChain={() => {
        onBeforeWalletAction?.();
        rainbow.openChainModal();
      }}
      onSwitchToTestnet={switchToTestnet}
    />
  );
}

export function WalletControl({
  mobile = false,
  onBeforeWalletAction,
}: WalletControlProps) {
  return (
    <ConnectButton.Custom>
      {({
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }) => (
        <WalletControlInner
          mobile={mobile}
          onBeforeWalletAction={onBeforeWalletAction}
          rainbow={{
            mounted,
            openAccountModal,
            openChainModal,
            openConnectModal,
          }}
        />
      )}
    </ConnectButton.Custom>
  );
}
