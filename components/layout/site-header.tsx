import Link from "next/link";
import { Suspense } from "react";

import { ComparisonNavLink } from "@/components/comparison/comparison-nav-link";
import { Brand } from "@/components/layout/brand";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { navigationItems } from "@/components/layout/navigation";
import { CatalogueNetworkSelectorData } from "@/components/network/catalogue-network-selector-data";
import { WalletControl } from "@/components/wallet/wallet-control";

function NetworkSelectorFallback({ mobile = false }: Readonly<{ mobile?: boolean }>) {
  return (
    <div
      className={mobile ? "h-10 w-full rounded-lg border border-input bg-background" : "h-10 w-40 rounded-lg border border-input bg-background"}
      aria-hidden="true"
    />
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-6 px-4 sm:px-6 lg:px-8 xl:grid xl:grid-cols-[1fr_auto_1fr]">
        <div className="flex min-w-0 items-center">
          <Brand />
        </div>

        <nav
          className="hidden items-center justify-center gap-1 xl:flex"
          aria-label="Primary navigation"
        >
          {navigationItems.map((item) =>
            item.label === "Compare" ? (
              <ComparisonNavLink
                key={item.label}
                className="inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors duration-200 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
              />
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors duration-200 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="ml-auto flex items-center justify-end gap-2 xl:ml-0">
          <div className="hidden items-center gap-2 xl:flex">
            <Suspense fallback={<NetworkSelectorFallback />}>
              <CatalogueNetworkSelectorData />
            </Suspense>
            <WalletControl />
          </div>

          <MobileNavigation
            networkControl={
              <Suspense fallback={<NetworkSelectorFallback mobile />}>
                <CatalogueNetworkSelectorData mobile />
              </Suspense>
            }
          />
        </div>
      </div>
    </header>
  );
}
