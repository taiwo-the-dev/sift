import { formatUnits, isAddress } from "viem";

import { getSupportedWalletChain } from "@/lib/blockchain/chains";

export type WalletErrorCode =
  | "chain-unavailable"
  | "provider-unavailable"
  | "request-pending"
  | "request-rejected"
  | "switch-unavailable"
  | "unknown";

export type WalletErrorMessage = Readonly<{
  code: WalletErrorCode;
  description: string;
  title: string;
}>;

type ErrorSignal = Readonly<{
  code: number | string | null;
  message: string;
  name: string;
}>;

function readErrorSignal(error: unknown): ErrorSignal {
  if (!error || typeof error !== "object") {
    return { code: null, message: "", name: "" };
  }

  const candidate = error as Readonly<{
    code?: unknown;
    message?: unknown;
    name?: unknown;
    shortMessage?: unknown;
  }>;

  return {
    code:
      typeof candidate.code === "number" || typeof candidate.code === "string"
        ? candidate.code
        : null,
    message:
      typeof candidate.shortMessage === "string"
        ? candidate.shortMessage
        : typeof candidate.message === "string"
          ? candidate.message
          : "",
    name: typeof candidate.name === "string" ? candidate.name : "",
  };
}

export function shortenWalletAddress(address: string | undefined): string | null {
  if (!address || !isAddress(address)) {
    return null;
  }

  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatWalletBalance(
  value: bigint | undefined,
  decimals: number | undefined,
  symbol: string | undefined,
): string | null {
  if (value === undefined || decimals === undefined || !symbol) {
    return null;
  }

  if (value === 0n) {
    return `0 ${symbol}`;
  }

  const [whole = "0", fraction = ""] = formatUnits(value, decimals).split(".");
  const visibleFraction = fraction.slice(0, 4).replace(/0+$/, "");

  if (whole === "0" && visibleFraction.length === 0) {
    return `<0.0001 ${symbol}`;
  }

  const groupedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `${groupedWhole}${visibleFraction ? `.${visibleFraction}` : ""} ${symbol}`;
}

export function describeWalletChain(chainId: unknown): string | null {
  const chain = getSupportedWalletChain(chainId);

  if (!chain) {
    return null;
  }

  return chain.id === 97 ? "BSC Testnet" : "BSC Mainnet";
}

export function mapWalletError(error: unknown): WalletErrorMessage {
  const signal = readErrorSignal(error);
  const document = `${signal.name} ${signal.message}`.toLowerCase();

  if (
    signal.code === 4001 ||
    document.includes("user rejected") ||
    document.includes("user denied") ||
    document.includes("rejectedrequest")
  ) {
    return {
      code: "request-rejected",
      title: "Request cancelled",
      description:
        "Your wallet cancelled the request. Nothing was signed or submitted; try again when you are ready.",
    };
  }

  if (
    signal.code === -32002 ||
    document.includes("request already pending") ||
    document.includes("resourceunavailable")
  ) {
    return {
      code: "request-pending",
      title: "Wallet request already open",
      description:
        "Open your wallet and finish or cancel the existing request before trying again.",
    };
  }

  if (
    document.includes("switchnot") ||
    document.includes("switchchainnotsupported") ||
    document.includes("switch chain not supported") ||
    document.includes("method not supported")
  ) {
    return {
      code: "switch-unavailable",
      title: "Automatic switching unavailable",
      description:
        "Open your wallet and manually select BSC Testnet (chain ID 97), then return to Sift.",
    };
  }

  if (
    document.includes("chainnotconfigured") ||
    document.includes("chain not configured") ||
    document.includes("unrecognized chain")
  ) {
    return {
      code: "chain-unavailable",
      title: "Network unavailable",
      description:
        "This network is not supported by Sift. Select BSC Testnet or BSC Mainnet in your wallet.",
    };
  }

  if (
    document.includes("providernotfound") ||
    document.includes("provider not found") ||
    document.includes("connector not connected") ||
    document.includes("no provider")
  ) {
    return {
      code: "provider-unavailable",
      title: "Wallet provider unavailable",
      description:
        "Install or unlock a supported wallet. On mobile, use a WalletConnect-enabled deployment.",
    };
  }

  return {
    code: "unknown",
    title: "Wallet request failed",
    description:
      "The wallet could not complete the request. Check that it is unlocked and try again.",
  };
}
