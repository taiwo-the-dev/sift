"use client";

import { Dialog } from "@base-ui/react/dialog";
import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ComparisonNavLink } from "@/components/comparison/comparison-nav-link";
import { navigationItems } from "@/components/layout/navigation";
import { buttonVariants } from "@/components/ui/button";
import { WalletControl } from "@/components/wallet/wallet-control";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="ml-auto md:hidden">
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Trigger
          aria-label="Open navigation"
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
        >
          <Menu className="size-5" aria-hidden="true" />
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-black/70 backdrop-blur-sm transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
          <Dialog.Popup aria-modal="true" className="fixed inset-x-3 top-3 z-50 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-xl border border-border bg-card p-3 shadow-2xl shadow-black/50 outline-none transition-[transform,opacity] duration-150 data-ending-style:-translate-y-2 data-ending-style:opacity-0 data-starting-style:-translate-y-2 data-starting-style:opacity-0 motion-reduce:transition-none sm:inset-x-6 sm:top-6">
            <div className="flex items-center justify-between gap-4 border-b border-border px-2 pb-3">
              <div>
                <Dialog.Title className="text-sm font-semibold text-foreground">
                  Sift navigation
                </Dialog.Title>
                <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                  Discover, compare, hire, and monitor AI agents.
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Close navigation"
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
              >
                <X className="size-5" aria-hidden="true" />
              </Dialog.Close>
            </div>

            <nav aria-label="Mobile navigation" className="mt-3 grid gap-1">
              {navigationItems.map((item) =>
                item.label === "Compare" ? (
                  <ComparisonNavLink
                    key={item.label}
                    mobile
                    onNavigate={() => setIsOpen(false)}
                    className="flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium text-foreground outline-none transition-colors duration-200 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
                  />
                ) : (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className="flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground outline-none transition-colors duration-200 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
                  >
                    {item.label}
                  </Link>
                ),
              )}
              <Link
                href="/discover#discovery-search"
                onClick={() => setIsOpen(false)}
                className={cn(buttonVariants({ variant: "brand", size: "lg" }), "mt-2")}
              >
                <Search className="size-4" aria-hidden="true" />
                Search agents
              </Link>
              <WalletControl
                mobile
                onBeforeWalletAction={() => setIsOpen(false)}
              />
            </nav>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
