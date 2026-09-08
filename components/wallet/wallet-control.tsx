"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import {
  useAccount,
  useBalance,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from "wagmi";

import {
  WalletControlView,
  type WalletConnectionView,
} from "@/components/wallet/wallet-control-view";
import {
  describeWalletChain,
  formatWalletBalance,
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
  const disconnect = useDisconnect();
  const switchChain = useSwitchChain();
  const [noticeState, setNoticeState] = useState<Readonly<{
    contextKey: string;
    message: WalletErrorMessage;
  }> | null>(null);
  const walletConnectConfigured = isWalletConnectConfigured();

  const chain = getSupportedWalletChain(account.chainId);
  const balance = useBalance({
    address: account.address,
    chainId: chain?.id,
    query: {
      enabled: account.status === "connected" && chain !== null,
    },
  });
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
    balanceLabel:
      account.status !== "connected" || chain === null || !account.address
        ? "Unavailable"
        : balance.isPending
          ? "Loading…"
          : (formatWalletBalance(
              balance.data?.value,
              balance.data?.decimals,
              balance.data?.symbol,
            ) ?? "Unavailable"),
    chainName:
      describeWalletChain(account.chainId) ??
      account.chain?.name ??
      "Unsupported network",
    connection,
    disconnecting: disconnect.isPending,
    notice,
    providerAvailable,
    switching: switchChain.isPending,
    supportedChain: account.status === "connected" ? chain !== null : undefined,
    walletName: account.connector?.name,
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
      onDisconnect={() => {
        setNoticeState(null);
        disconnect.disconnect(undefined, {
          onError(error) {
            setNoticeState({ contextKey, message: mapWalletError(error) });
          },
          onSuccess() {
            onBeforeWalletAction?.();
          },
        });
      }}
      onDismissNotice={() => setNoticeState(null)}
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
        openChainModal,
        openConnectModal,
      }) => (
        <WalletControlInner
          mobile={mobile}
          onBeforeWalletAction={onBeforeWalletAction}
          rainbow={{
            mounted,
            openChainModal,
            openConnectModal,
          }}
        />
      )}
    </ConnectButton.Custom>
  );
}
