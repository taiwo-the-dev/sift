import type { PropsWithChildren } from "react";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";

export function AppShell({ children }: Readonly<PropsWithChildren>) {
  return (
    <div className="flex min-h-svh flex-col">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-foreground px-4 py-2 text-background focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>

      <SiteHeader />

      <main id="main-content" className="flex flex-1 flex-col">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
