"use client";

import { Dialog } from "@base-ui/react/dialog";
import {
  Bookmark,
  BriefcaseBusiness,
  Compass,
  Menu,
  Search,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { ComparisonNavLink } from "@/components/comparison/comparison-nav-link";
import { Brand } from "@/components/layout/brand";
import { navigationItems } from "@/components/layout/navigation";
import { buttonVariants } from "@/components/ui/button";
import { WalletControl } from "@/components/wallet/wallet-control";
import { cn } from "@/lib/utils";

const navigationIcons: Readonly<Record<string, LucideIcon>> = {
  "/dashboard": BriefcaseBusiness,
  "/discover": Compass,
  "/saved": Bookmark,
};

function isCurrentRoute(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="ml-auto lg:hidden">
      <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
        <Dialog.Trigger
          aria-label="Open navigation"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "border-border/80 bg-card/60",
          )}
        >
          <Menu className="size-5" aria-hidden="true" />
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 min-h-dvh bg-black/75 backdrop-blur-sm transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
          <Dialog.Popup
            aria-modal="true"
            className="fixed inset-y-0 right-0 z-50 flex h-dvh w-[min(92vw,24rem)] flex-col overflow-hidden border-l border-border bg-background shadow-2xl shadow-black/60 outline-none transition-[transform,opacity] duration-200 data-ending-style:translate-x-full data-ending-style:opacity-0 data-starting-style:translate-x-full data-starting-style:opacity-0 motion-reduce:transition-none"
          >
            <Dialog.Title className="sr-only">Sift navigation</Dialog.Title>
            <Dialog.Description className="sr-only">
              Navigate Sift and manage your connected wallet.
            </Dialog.Description>

            <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-5">
              <Brand onClick={() => setIsOpen(false)} />
              <Dialog.Close
                aria-label="Close navigation"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon" }),
                  "rounded-full",
                )}
              >
                <X className="size-5" aria-hidden="true" />
              </Dialog.Close>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6">
              <p className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Menu
              </p>

              <nav aria-label="Mobile navigation" className="mt-3 grid gap-1.5">
                {navigationItems.map((item) => {
                  const active = isCurrentRoute(pathname, item.href);

                  if (item.label === "Compare") {
                    return (
                      <ComparisonNavLink
                        key={item.label}
                        active={active}
                        mobile
                        onNavigate={() => setIsOpen(false)}
                        className={cn(
                          "flex min-h-12 items-center gap-3 rounded-xl border px-3.5 text-sm font-semibold outline-none transition-[background-color,border-color,color] duration-200 focus-visible:ring-3 focus-visible:ring-ring/30",
                          active
                            ? "border-brand/25 bg-brand/10 text-foreground"
                            : "border-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
                        )}
                      />
                    );
                  }

                  const Icon = navigationIcons[item.href];

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-12 items-center gap-3 rounded-xl border px-3.5 text-sm font-semibold outline-none transition-[background-color,border-color,color] duration-200 focus-visible:ring-3 focus-visible:ring-ring/30",
                        active
                          ? "border-brand/25 bg-brand/10 text-foreground"
                          : "border-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground",
                      )}
                    >
                      {Icon ? (
                        <Icon className="size-4 text-brand" aria-hidden="true" />
                      ) : null}
                      {item.label}
                    </Link>
                  );
                })}
              </nav>

              <div className="my-6 h-px bg-border" />

              <p className="px-2 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Quick actions
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link
                  href="/discover#discovery-search"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    buttonVariants({ variant: "brand", size: "lg" }),
                    "min-w-0 px-3",
                  )}
                >
                  <Search className="size-4" aria-hidden="true" />
                  Search
                </Link>
                <Link
                  href="/permissions"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "min-w-0 px-3",
                  )}
                >
                  <ShieldCheck className="size-4" aria-hidden="true" />
                  Safety
                </Link>
              </div>
            </div>

            <div className="shrink-0 border-t border-border bg-card/45 p-4">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-xs font-semibold text-foreground">Wallet</p>
                  <p className="mt-0.5 text-[0.68rem] text-muted-foreground">
                    Connect to hire and manage jobs.
                  </p>
                </div>
                <span className="rounded-full border border-brand/20 bg-brand/8 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-brand">
                  BNB Chain
                </span>
              </div>
              <WalletControl
                mobile
                onBeforeWalletAction={() => setIsOpen(false)}
              />
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
