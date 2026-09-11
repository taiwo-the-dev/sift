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
      <div className="relative mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-8">
        <Brand className="justify-self-start" />

        <nav
          className="hidden items-center justify-center gap-1 lg:flex"
          aria-label="Primary navigation"
        >
          {navigationItems.map((item) =>
            item.label === "Compare" ? (
              <ComparisonNavLink
                key={item.label}
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors duration-200 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
              />
            ) : (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors duration-200 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden items-center justify-self-end gap-2 lg:flex">
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
    </header>
  );
}
