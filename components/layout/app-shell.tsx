import Link from "next/link";
import type { PropsWithChildren } from "react";

import { Button } from "@/components/ui/button";

export function AppShell({ children }: Readonly<PropsWithChildren>) {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-foreground px-4 py-2 text-background focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <header className="border-b border-border bg-background/95">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md font-semibold tracking-tight outline-none focus-visible:ring-3 focus-visible:ring-ring/30"
            aria-label="Sift home"
          >
            <span
              aria-hidden="true"
              className="grid size-8 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-foreground"
            >
              S
            </span>
            <span className="text-lg">Sift</span>
          </Link>

          <nav className="ml-auto" aria-label="Primary navigation">
            <Link
              href="/"
              aria-current="page"
              className="rounded-md px-3 py-2 text-sm font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/30"
            >
              Overview
            </Link>
          </nav>

          <Button
            variant="outline"
            size="sm"
            disabled
            title="Wallet connection is planned for milestone M8"
            className="hidden sm:inline-flex"
          >
            Connect wallet
          </Button>
        </div>
      </header>

      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
