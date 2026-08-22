import { Search } from "lucide-react";
import Link from "next/link";

import { Brand } from "@/components/layout/brand";
import { MobileNavigation } from "@/components/layout/mobile-navigation";
import { navigationItems } from "@/components/layout/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="relative mx-auto flex h-16 w-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
        <Brand />

        <nav
          className="ml-7 hidden items-center gap-1 md:flex"
          aria-label="Primary navigation"
        >
          {navigationItems.map((item) =>
            item.href ? (
              <Link
                key={item.label}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors duration-200 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
              >
                {item.label}
              </Link>
            ) : (
              <span
                key={item.label}
                aria-disabled="true"
                title={`${item.label} is planned for a later milestone`}
                className="cursor-not-allowed px-3 py-2 text-sm font-medium text-muted-foreground"
              >
                {item.label}
              </span>
            ),
          )}
        </nav>

        <div className="ml-auto hidden items-center gap-2 md:flex">
          <Link
            href="/discover#discovery-search"
            aria-label="Search for agents"
            title="Search for agents"
            className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}
          >
            <Search className="size-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            disabled
            title="Wallet connection is planned for a later milestone"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Connect Wallet
          </button>
        </div>

        <MobileNavigation />
      </div>
    </header>
  );
}
