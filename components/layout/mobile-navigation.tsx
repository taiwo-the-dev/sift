"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ComparisonNavLink } from "@/components/comparison/comparison-nav-link";
import { navigationItems } from "@/components/layout/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { WalletControl } from "@/components/wallet/wallet-control";
import { cn } from "@/lib/utils";

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  return (
    <div className="ml-auto md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={isOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <Menu className="size-5" aria-hidden="true" />
        )}
      </Button>

      {isOpen ? (
        <div
          id="mobile-navigation"
          className="absolute inset-x-4 top-[calc(100%+0.5rem)] rounded-xl border border-border bg-card p-3 shadow-xl shadow-slate-950/10"
        >
          <nav aria-label="Mobile navigation" className="grid gap-1">
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
            <WalletControl mobile />
          </nav>
        </div>
      ) : null}
    </div>
  );
}
