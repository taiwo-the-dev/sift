"use client";

import { ExternalLink, LoaderCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAltanaSession } from "@/components/altana/altana-session-provider";
import { AltanaWalletFunding } from "@/components/altana/altana-wallet-funding";
import { Button } from "@/components/ui/button";
import { HiringErrorNotice } from "@/components/hiring/hiring-error-notice";
import {
  buildAltanaKeyStoreHref,
  formatAltanaGasCap,
} from "@/features/altana/protocol";
import {
  getErc8183Deployment,
  type HiringChainId,
} from "@/features/hiring/protocol";
import {
  describeHiringError,
  type HiringErrorDescription,
} from "@/features/hiring/error-presentation";

export function altanaSessionCovers(
  record: ReturnType<typeof useAltanaSession>["publicSessions"][HiringChainId],
  walletAddress: string | null,
  tokenCap: bigint,
  hasLiveSession: boolean,
): boolean {
  return Boolean(
    record &&
      walletAddress &&
      record.walletAddress.toLowerCase() === walletAddress.toLowerCase() &&
      record.status === "active" &&
      record.lastHireHash === undefined &&
      BigInt(record.tokenCapBaseUnits) === tokenCap &&
      hasLiveSession,
  );
}

export function AltanaHiringPermissions({
  budget,
  chainId,
}: Readonly<{ budget: bigint; chainId: HiringChainId }>) {
  const altana = useAltanaSession();
  const record = altana.publicSessions[chainId];
  const live = altana.hasLiveSession(chainId);
  const deployment = getErc8183Deployment(chainId);
  const ready = altanaSessionCovers(record, altana.walletAddress, budget, live);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<HiringErrorDescription | null>(null);
  const [mainnetAccepted, setMainnetAccepted] = useState(false);

  async function grant(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await altana.grantHiringSession(chainId, budget);
    } catch (caught) {
      setError(describeHiringError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand/30 bg-brand/6 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="size-4 text-brand" aria-hidden="true" />
            Protected hire permission
          </p>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">
            Valid for one hour and limited to creating and funding this reviewed job.
          </p>
        </div>
        {ready ? (
          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/8 px-2.5 py-1 text-xs font-semibold text-emerald-200">
            Active and ready
          </span>
        ) : (
          <Button type="button" size="sm" onClick={grant} disabled={busy || !altana.walletAddress || record?.status === "active" || (deployment.isMainnet && !mainnetAccepted)}>
            {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : null}
            {busy ? "Creating permission" : "Create protected permission"}
          </Button>
        )}
      </div>
      {altana.walletAddress && !ready ? (
        <AltanaWalletFunding address={altana.walletAddress} chainId={chainId} />
      ) : null}
      {deployment.isMainnet && !ready ? (
        <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/8 px-3 py-2.5 text-xs leading-5 text-amber-100">
          <input type="checkbox" className="mt-0.5 size-3.5 accent-amber-400" checked={mainnetAccepted} onChange={(event) => setMainnetAccepted(event.target.checked)} />
          <span>I understand this permission is registered on BSC Mainnet and its use may spend real assets.</span>
        </label>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span>Token cap: exact signed budget</span>
        <span>Gas cap: {formatAltanaGasCap(20_000_000_000_000_000n)}</span>
        <a className="inline-flex items-center gap-1 text-foreground hover:text-brand" href={buildAltanaKeyStoreHref(chainId)} target="_blank" rel="noreferrer noopener">
          View KeyStore <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>
      {record?.status === "active" && !ready ? (
        <p className="mt-3 text-xs text-amber-200">
          The existing session cannot cover this hire, or its private session key is no longer in memory. Revoke it in <Link className="underline" href="/permissions">Permissions</Link>, then create a fresh one.
        </p>
      ) : null}
      {error ? <div className="mt-3"><HiringErrorNotice error={error} /></div> : null}
    </div>
  );
}
