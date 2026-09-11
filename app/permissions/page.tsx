import type { Metadata } from "next";

import { AltanaSessionControls } from "@/components/altana/altana-session-controls";
import { catalogueChainId } from "@/features/network/selection";
import { getSelectedCatalogueNetwork } from "@/lib/network/selection";

export const metadata: Metadata = {
  title: "Wallet safety",
  description: "Create, inspect, and stop protected hiring permissions for Sift.",
};

export default async function PermissionsPage() {
  const network = await getSelectedCatalogueNetwork();

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Wallet control</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Control your protected hiring wallet.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          See the wallet address, check its balance, and stop a time-limited hiring permission. For an actual job, create the exact permission from that agent&apos;s hiring flow.
        </p>
      </header>
      <AltanaSessionControls
        key={network}
        initialChainId={catalogueChainId(network)}
      />
    </main>
  );
}
