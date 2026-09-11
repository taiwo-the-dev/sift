"use client";

import { Popover } from "@base-ui/react/popover";
import {
  ChevronDown,
  CircleAlert,
  Coins,
  LoaderCircle,
  LogOut,
  Network,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import type { WalletErrorMessage } from "@/features/wallet/presentation";
import { cn } from "@/lib/utils";

export type WalletConnectionView = Readonly<{
  addressLabel?: string;
  balanceLabel?: string;
  chainName?: string;
  connection:
    | "connected"
    | "connecting"
    | "disconnected"
    | "hydrating"
    | "reconnecting";
  notice?: WalletErrorMessage | null;
  disconnecting?: boolean;
  providerAvailable?: boolean;
  switching?: boolean;
  supportedChain?: boolean;
  walletName?: string;
}>;

interface WalletControlViewProps {
  mobile?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onDismissNotice?: () => void;
  onNavigatePermissions?: () => void;
  onOpenChain?: () => void;
  onSwitchToTestnet?: () => void;
  view: WalletConnectionView;
}

export function WalletControlView({
  mobile = false,
  onConnect,
  onDisconnect,
  onDismissNotice,
  onNavigatePermissions,
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

          <Popover.Root>
            <Popover.Trigger
              aria-describedby={view.notice ? "wallet-control-notice" : undefined}
              aria-label={`Connected wallet ${view.addressLabel ?? "address unavailable"}. Open wallet menu`}
              className={buttonVariants({
                variant: "brand",
                size: mobile ? "lg" : "default",
              })}
            >
              <span
                className="size-2 rounded-full bg-emerald-800"
                aria-hidden="true"
              />
              {view.addressLabel ?? "Connected"}
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </Popover.Trigger>

            <Popover.Portal>
              <Popover.Positioner
                align="end"
                side="bottom"
                sideOffset={6}
                className="z-[70] w-56 outline-none"
              >
                <Popover.Popup className="w-56 origin-[var(--transform-origin)] overflow-hidden rounded-lg border border-input bg-popover p-1.5 text-popover-foreground shadow-2xl shadow-black/45 outline-none transition-[opacity,transform] duration-150 data-ending-style:-translate-y-1 data-ending-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:opacity-0 motion-reduce:transition-none">
                  <div className="px-2.5 py-2">
                    <Popover.Title className="text-sm font-semibold text-foreground">
                      Wallet connected
                    </Popover.Title>
                    <Popover.Description className="mt-0.5 truncate text-xs text-muted-foreground">
                      {view.walletName ?? "Connected wallet"}
                    </Popover.Description>
                  </div>

                  <dl className="border-y border-border py-1.5">
                    <div className="flex min-w-0 items-center gap-2.5 rounded-md px-2.5 py-2">
                      <Coins
                        className="size-4 shrink-0 text-brand"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <dt className="text-[0.65rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                          Balance
                        </dt>
                        <dd
                          className="mt-0.5 truncate font-mono text-xs font-semibold text-foreground"
                          title={view.balanceLabel}
                        >
                          {view.balanceLabel ?? "Unavailable"}
                        </dd>
                      </div>
                    </div>
                  </dl>

                  <div className="py-1.5">
                    <Popover.Close
                      render={<Link href="/permissions" />}
                      nativeButton={false}
                      onClick={onNavigatePermissions}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "default" }),
                        "h-auto w-full justify-start px-2.5 py-2 text-xs",
                      )}
                    >
                      <ShieldCheck
                        className="size-4 shrink-0 text-brand"
                        aria-hidden="true"
                      />
                      <span className="grid min-w-0 gap-0.5 text-left">
                        <span className="font-semibold text-foreground">
                          Permissions
                        </span>
                        <span className="text-[0.65rem] font-normal text-muted-foreground">
                          Manage hiring access
                        </span>
                      </span>
                    </Popover.Close>
                  </div>

                  <div className="border-t border-border pt-1.5">
                    <Popover.Close
                      type="button"
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "default" }),
                        "w-full justify-start px-2.5 text-xs text-red-300 hover:bg-red-400/8 hover:text-red-200",
                      )}
                      disabled={view.disconnecting}
                      onClick={onDisconnect}
                    >
                      {view.disconnecting ? (
                        <LoaderCircle
                          className="size-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <LogOut className="size-4" aria-hidden="true" />
                      )}
                      {view.disconnecting ? "Disconnecting…" : "Disconnect"}
                    </Popover.Close>
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
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
