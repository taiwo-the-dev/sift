import {
  ChevronDown,
  CircleAlert,
  LoaderCircle,
  Network,
  WalletCards,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WalletErrorMessage } from "@/features/wallet/presentation";
import { cn } from "@/lib/utils";

export type WalletConnectionView = Readonly<{
  addressLabel?: string;
  chainName?: string;
  connection:
    | "connected"
    | "connecting"
    | "disconnected"
    | "hydrating"
    | "reconnecting";
  notice?: WalletErrorMessage | null;
  providerAvailable?: boolean;
  switching?: boolean;
  supportedChain?: boolean;
}>;

interface WalletControlViewProps {
  mobile?: boolean;
  onConnect?: () => void;
  onDismissNotice?: () => void;
  onOpenAccount?: () => void;
  onOpenChain?: () => void;
  onSwitchToTestnet?: () => void;
  view: WalletConnectionView;
}

export function WalletControlView({
  mobile = false,
  onConnect,
  onDismissNotice,
  onOpenAccount,
  onOpenChain,
  onSwitchToTestnet,
  view,
}: WalletControlViewProps) {
  const controlClassName = mobile ? "w-full" : undefined;

  return (
    <div className={cn("relative", mobile && "w-full")}>
      {view.connection === "hydrating" ? (
        <Button
          type="button"
          variant="outline"
          size={mobile ? "lg" : "default"}
          className={controlClassName}
          disabled
          aria-label="Loading wallet connection"
        >
          <WalletCards className="size-4" aria-hidden="true" />
          Connect Wallet
        </Button>
      ) : null}

      {view.connection === "connecting" ||
      view.connection === "reconnecting" ? (
        <Button
          type="button"
          variant="outline"
          size={mobile ? "lg" : "default"}
          className={controlClassName}
          disabled
          aria-live="polite"
        >
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          {view.connection === "connecting" ? "Connecting…" : "Reconnecting…"}
        </Button>
      ) : null}

      {view.connection === "disconnected" ? (
        <Button
          type="button"
          variant="outline"
          size={mobile ? "lg" : "default"}
          className={controlClassName}
          onClick={onConnect}
          aria-describedby={view.notice ? "wallet-control-notice" : undefined}
        >
          {view.providerAvailable === false ? (
            <CircleAlert className="size-4 text-amber-300" aria-hidden="true" />
          ) : (
            <WalletCards className="size-4" aria-hidden="true" />
          )}
          {view.providerAvailable === false
            ? "Wallet unavailable"
            : "Connect Wallet"}
        </Button>
      ) : null}

      {view.connection === "connected" && view.supportedChain === false ? (
        <Button
          type="button"
          variant="outline"
          size={mobile ? "lg" : "default"}
          className={cn(
            controlClassName,
            "border-amber-400/40 bg-amber-400/8 text-amber-100 hover:bg-amber-400/12",
          )}
          disabled={view.switching}
          onClick={onSwitchToTestnet}
          aria-describedby={view.notice ? "wallet-control-notice" : undefined}
        >
          {view.switching ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <CircleAlert className="size-4" aria-hidden="true" />
          )}
          {view.switching ? "Switching…" : "Switch to BSC Testnet"}
        </Button>
      ) : null}

      {view.connection === "connected" && view.supportedChain !== false ? (
        <div
          className={cn(
            "flex items-stretch gap-1.5",
            mobile && "grid w-full grid-cols-[minmax(0,1fr)_auto]",
          )}
        >
          <Button
            type="button"
            variant="outline"
            size={mobile ? "lg" : "default"}
            className={cn(mobile && "min-w-0 justify-start")}
            onClick={onOpenChain}
            aria-label={`Current network: ${view.chainName ?? "Unknown network"}. Change network`}
          >
            <Network className="size-4 shrink-0 text-brand" aria-hidden="true" />
            <span className="truncate">{view.chainName ?? "Unknown network"}</span>
            <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="brand"
            size={mobile ? "lg" : "default"}
            onClick={onOpenAccount}
            aria-label={`Connected wallet ${view.addressLabel ?? "address unavailable"}. Open wallet menu`}
          >
            <span className="size-2 rounded-full bg-emerald-800" aria-hidden="true" />
            {view.addressLabel ?? "Connected"}
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      {view.notice ? (
        <div
          id="wallet-control-notice"
          role="alert"
          className={cn(
            "z-50 mt-2 rounded-xl border border-amber-400/30 bg-[#17150f] p-3 text-left shadow-xl shadow-black/30",
            !mobile && "absolute right-0 top-full w-80",
          )}
        >
          <div className="flex items-start gap-2.5">
            <CircleAlert
              className="mt-0.5 size-4 shrink-0 text-amber-300"
              aria-hidden="true"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">
                {view.notice.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {view.notice.description}
              </p>
            </div>
            {onDismissNotice ? (
              <button
                type="button"
                onClick={onDismissNotice}
                aria-label="Dismiss wallet message"
                className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
