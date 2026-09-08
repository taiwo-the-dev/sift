"use client";

import { Fingerprint, LoaderCircle, ShieldCheck, WalletCards } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CopyButton } from "@/components/agents/copy-button";
import { useAltanaSession } from "@/components/altana/altana-session-provider";
import { Button } from "@/components/ui/button";
import { HiringErrorNotice } from "@/components/hiring/hiring-error-notice";
import {
  describeHiringError,
  type HiringErrorDescription,
} from "@/features/hiring/error-presentation";
import type { HiringExecutionMode } from "@/features/hiring/model";
import type { HiringChainId } from "@/features/hiring/protocol";
import { cn } from "@/lib/utils";

export function HiringMethodSelector({
  chainId,
  mode,
  onChange,
}: Readonly<{
  chainId: HiringChainId;
  mode: HiringExecutionMode;
  onChange: (mode: HiringExecutionMode) => void;
}>) {
  const altana = useAltanaSession();
  const [busy, setBusy] = useState<"create" | "recover" | null>(null);
  const [error, setError] = useState<HiringErrorDescription | null>(null);

  async function prepare(action: "create" | "recover"): Promise<void> {
    setBusy(action);
    setError(null);
    try {
      if (action === "create") await altana.createPasskeyWallet();
      else await altana.recoverPasskeyWallet(chainId);
    } catch (caught) {
      setError(describeHiringError(caught));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="mb-7 space-y-3" aria-labelledby="hiring-method-title">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          How you approve the hire
        </p>
        <h2 id="hiring-method-title" className="mt-2 text-lg font-semibold text-foreground">
          Choose a signing method
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          aria-pressed={mode === "altana"}
          onClick={() => onChange("altana")}
          className={cn(
            "rounded-xl border p-4 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30",
            mode === "altana"
              ? "border-brand/55 bg-brand/8"
              : "border-border bg-background/45 hover:border-input",
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="size-4 text-brand" aria-hidden="true" />
            Protected hire
            <span className="rounded-full bg-brand px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-brand-foreground">
              Recommended
            </span>
          </span>
          <span className="mt-2 block text-xs leading-5 text-muted-foreground">
            Use a passkey wallet with a one-hour limit for this exact job budget.
          </span>
        </button>
        <button
          type="button"
          aria-pressed={mode === "wallet"}
          onClick={() => onChange("wallet")}
          className={cn(
            "rounded-xl border p-4 text-left outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/30",
            mode === "wallet"
              ? "border-brand/55 bg-brand/8"
              : "border-border bg-background/45 hover:border-input",
          )}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <WalletCards className="size-4 text-brand" aria-hidden="true" />
            Connected wallet
          </span>
          <span className="mt-2 block text-xs leading-5 text-muted-foreground">
            Use RainbowKit and approve each ERC-8183 contract transaction separately.
          </span>
        </button>
      </div>

      {mode === "altana" ? (
        <div className="rounded-xl border border-border bg-background/45 p-4">
          {altana.walletAddress ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Fingerprint className="size-4 text-emerald-300" aria-hidden="true" />
                  Passkey wallet ready
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all font-mono text-xs text-muted-foreground">
                    {altana.walletAddress}
                  </code>
                  <CopyButton
                    label="passkey wallet address"
                    value={altana.walletAddress}
                  />
                </div>
              </div>
              <Link className="text-xs font-semibold text-brand hover:underline" href="/permissions">
                Manage permissions
              </Link>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-foreground">Set up a passkey wallet</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Your fingerprint, face unlock, or device PIN protects this wallet. Sift never receives a private key.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => prepare("create")} disabled={busy !== null}>
                  {busy === "create" ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <Fingerprint className="size-3.5" aria-hidden="true" />}
                  Create passkey wallet
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => prepare("recover")} disabled={busy !== null}>
                  {busy === "recover" ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : null}
                  Recover existing wallet
                </Button>
              </div>
            </div>
          )}
          {error ? <div className="mt-3"><HiringErrorNotice error={error} /></div> : null}
        </div>
      ) : null}
    </section>
  );
}
