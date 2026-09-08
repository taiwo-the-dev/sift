import type { Metadata } from "next";

import { AltanaSessionControls } from "@/components/altana/altana-session-controls";

export const metadata: Metadata = {
  title: "Permissions",
  description: "Create, inspect, and revoke bounded Altana hiring permissions for Sift.",
};

export default function PermissionsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Wallet control</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Agent permissions you can see and stop.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          Protected sessions let Sift perform only the hiring actions you approve, within a budget and expiry. Their public authority is registered in Altana KeyStore and can be revoked here.
        </p>
      </header>
      <AltanaSessionControls />
    </main>
  );
}
