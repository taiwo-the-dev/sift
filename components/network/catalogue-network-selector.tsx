"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown, Database, FlaskConical, LoaderCircle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useAccount, useSwitchChain } from "wagmi";

import {
  catalogueChainId,
  catalogueNetworkForChainId,
  catalogueNetworkCookie,
  catalogueNetworkOptions,
  parseCatalogueNetwork,
} from "@/features/network/selection";
import type { SupportedBnbNetwork } from "@/lib/blockchain/chains";
import { cn } from "@/lib/utils";

interface CatalogueNetworkSelectorProps {
  initialNetwork: SupportedBnbNetwork;
  mobile?: boolean;
}

function persistNetwork(network: SupportedBnbNetwork): void {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${catalogueNetworkCookie}=${network}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function CatalogueNetworkSelector({
  initialNetwork,
  mobile = false,
}: CatalogueNetworkSelectorProps) {
  const account = useAccount();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const switchChain = useSwitchChain();
  const [pending, startTransition] = useTransition();
  const urlNetwork = parseCatalogueNetwork(searchParams.get("network"));
  const routeChainId = /^\/(?:agents|hire|start)\/(56|97)(?:\/|$)/.exec(
    pathname,
  )?.[1];
  const routeNetwork = catalogueNetworkForChainId(
    routeChainId ? Number(routeChainId) : null,
  );
  const [localNetwork, setLocalNetwork] = useState(initialNetwork);
  const selectedNetwork = routeNetwork ?? urlNetwork ?? localNetwork;
  const selectedOption =
    catalogueNetworkOptions.find(
      (option) => option.value === selectedNetwork,
    ) ?? catalogueNetworkOptions[0];
  const options = useMemo(
    () =>
      catalogueNetworkOptions.map((option) => ({
        label: option.label,
        value: option.value,
      })),
    [],
  );

  useEffect(() => {
    const contextualNetwork = routeNetwork ?? urlNetwork;
    if (contextualNetwork) persistNetwork(contextualNetwork);
  }, [routeNetwork, urlNetwork]);

  function selectNetwork(network: SupportedBnbNetwork): void {
    if (network === selectedNetwork) return;

    const chainId = catalogueChainId(network);
    setLocalNetwork(network);
    persistNetwork(network);

    if (account.status === "connected" && account.chainId !== chainId) {
      switchChain.switchChain({ chainId });
    }

    startTransition(() => {
      if (/^\/(agents|hire|start)\//.test(pathname) || pathname === "/compare") {
        router.push(
          network === "bsc-mainnet"
            ? "/discover"
            : "/discover?network=bsc-testnet",
        );
        return;
      }

      if (pathname === "/discover") {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("page");
        if (network === "bsc-mainnet") {
          params.delete("network");
        } else {
          params.set("network", network);
        }
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
        return;
      }

      router.refresh();
    });
  }

  return (
    <Select.Root<SupportedBnbNetwork>
      items={options}
      value={selectedNetwork}
      onValueChange={(network) => {
        if (network) selectNetwork(network);
      }}
    >
      <Select.Trigger
        aria-label={`Browsing ${selectedOption.label}. Change network`}
        className={cn(
          "group flex h-10 min-w-0 cursor-pointer items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm font-medium text-foreground outline-none transition-[border-color,background-color,box-shadow] hover:border-muted-foreground/70 hover:bg-card focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15 data-popup-open:border-ring data-popup-open:bg-card",
          mobile ? "w-full justify-start" : "max-w-44",
        )}
      >
        {pending || switchChain.isPending ? (
          <LoaderCircle className="size-4 shrink-0 animate-spin text-brand" aria-hidden="true" />
        ) : selectedNetwork === "bsc-testnet" ? (
          <FlaskConical className="size-4 shrink-0 text-brand" aria-hidden="true" />
        ) : (
          <Database className="size-4 shrink-0 text-brand" aria-hidden="true" />
        )}
        <Select.Value className="min-w-0 flex-1 truncate" />
        <Select.Icon className="grid size-4 shrink-0 place-items-center text-muted-foreground">
          <ChevronDown
            className="size-3.5 transition-transform group-data-[popup-open]:rotate-180"
            aria-hidden="true"
          />
        </Select.Icon>
      </Select.Trigger>

      <Select.Portal>
        <Select.Positioner
          align="end"
          alignItemWithTrigger={false}
          side="bottom"
          sideOffset={6}
          className="z-[70] w-[var(--anchor-width)] min-w-52 outline-none"
        >
          <Select.Popup className="w-full origin-[var(--transform-origin)] overflow-hidden rounded-lg border border-input bg-popover p-1.5 text-popover-foreground shadow-2xl shadow-black/45 outline-none transition-[opacity,transform] duration-150 data-ending-style:-translate-y-1 data-ending-style:opacity-0 data-starting-style:-translate-y-1 data-starting-style:opacity-0 motion-reduce:transition-none">
            <Select.List className="outline-none">
              {catalogueNetworkOptions.map((option) => {
                const Icon =
                  option.value === "bsc-testnet" ? FlaskConical : Database;

                return (
                  <Select.Item
                    key={option.value}
                    value={option.value}
                    className="grid min-h-12 w-full cursor-pointer grid-cols-[1.75rem_minmax(0,1fr)_1.25rem] items-center gap-2 rounded-md px-2.5 py-2 text-sm text-muted-foreground outline-none transition-colors data-highlighted:bg-muted data-highlighted:text-foreground data-selected:bg-brand/8 data-selected:text-foreground"
                  >
                    <Icon className="size-4 text-brand" aria-hidden="true" />
                    <span className="min-w-0">
                      <Select.ItemText className="block truncate font-semibold">
                        {option.label}
                      </Select.ItemText>
                      <span className="mt-0.5 block text-[0.65rem] text-muted-foreground">
                        Chain {option.chainId} · {option.shortLabel}
                      </span>
                    </span>
                    <Select.ItemIndicator className="grid size-5 place-items-center rounded-full bg-brand text-brand-foreground">
                      <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />
                    </Select.ItemIndicator>
                  </Select.Item>
                );
              })}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  );
}
