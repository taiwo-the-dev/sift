"use client";

import {
  CircleCheck,
  ExternalLink,
  Fingerprint,
  KeyRound,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { useState } from "react";
import { formatUnits, parseUnits } from "viem";

import { useAltanaSession } from "@/components/altana/altana-session-provider";
import { AltanaWalletFunding } from "@/components/altana/altana-wallet-funding";
import { HiringErrorNotice } from "@/components/hiring/hiring-error-notice";
import { Button } from "@/components/ui/button";
import {
  buildAltanaKeyStoreHref,
  buildAltanaTransactionHref,
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
import { cn } from "@/lib/utils";

type PendingAction = "create" | "grant" | "recover" | "refresh" | "revoke";

function sessionStatusLabel(status: string): string {
  if (status === "active") return "Active";
  if (status === "revoked") return "Revoked";
  if (status === "expired") return "Expired";
  return "Needs verification";
}

export function AltanaSessionControls() {
  const altana = useAltanaSession();
  const [chainId, setChainId] = useState<HiringChainId>(97);
  const [tokenCap, setTokenCap] = useState("1");
  const [mainnetAccepted, setMainnetAccepted] = useState(false);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<HiringErrorDescription | null>(null);
  const deployment = getErc8183Deployment(chainId);
  const session = altana.publicSessions[chainId];

  async function run(
    action: PendingAction,
    operation: () => Promise<unknown>,
    success: string,
  ): Promise<void> {
    setPending(action);
    setNotice(null);
    setError(null);
    try {
      await operation();
      setNotice(success);
    } catch (caught) {
      setError(describeHiringError(caught));
    } finally {
      setPending(null);
    }
  }

  function parseCap(): bigint {
    try {
      const cap = parseUnits(tokenCap.trim(), deployment.tokenDecimals);
      if (cap < 0n) throw new Error();
      return cap;
    } catch {
      throw new Error(`Enter a valid non-negative ${deployment.tokenSymbol} spending cap.`);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Passkey wallet</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">
              {altana.walletAddress ? "Your protected wallet is ready" : "Create or recover your protected wallet"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Your device protects the admin passkey. Sift stores only the public wallet and credential handle, never a private key or seed phrase.
            </p>
          </div>
          {altana.walletAddress ? (
            <span className="rounded-full border border-emerald-400/25 bg-emerald-400/8 px-3 py-1.5 font-mono text-xs text-emerald-200">
              Wallet ready
            </span>
          ) : null}
        </div>
        {altana.walletAddress ? (
          <AltanaWalletFunding address={altana.walletAddress} chainId={chainId} />
        ) : null}
        {!altana.walletAddress ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <Button disabled={pending !== null} onClick={() => run("create", altana.createPasskeyWallet, "Passkey wallet created.")}>
              {pending === "create" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Fingerprint className="size-4" aria-hidden="true" />}
              Create passkey wallet
            </Button>
            <Button variant="outline" disabled={pending !== null} onClick={() => run("recover", () => altana.recoverPasskeyWallet(chainId), "Passkey wallet recovered.")}>
              {pending === "recover" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <KeyRound className="size-4" aria-hidden="true" />}
              Recover existing wallet
            </Button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Network</p>
            <h2 className="mt-2 text-xl font-semibold text-foreground">Permission details</h2>
          </div>
          <div className="inline-flex rounded-lg border border-border bg-background p-1" aria-label="Permission network">
            {([97, 56] as const).map((candidate) => (
              <button
                key={candidate}
                type="button"
                onClick={() => {
                  setChainId(candidate);
                  setTokenCap(candidate === 97 ? "1" : "0");
                  setMainnetAccepted(false);
                  setNotice(null);
                }}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  chainId === candidate ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {candidate === 97 ? "BSC Testnet" : "BSC Mainnet"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <p className="text-sm font-semibold text-foreground">Allowed actions</p>
            <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {["Create an ERC-8183 job", "Register the reviewed policy", "Set the signed job budget", "Fund the reviewed job"].map((item) => (
                <li key={item} className="flex items-center gap-2 rounded-lg border border-border bg-background/45 px-3 py-2.5">
                  <CircleCheck className="size-3.5 shrink-0 text-emerald-300" aria-hidden="true" />{item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Token approval is intentionally excluded. Your passkey approves only the exact job amount during hiring, so revoking the session cannot leave behind a session-created allowance.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/45 p-4">
            <label className="text-xs font-medium text-muted-foreground" htmlFor="altana-token-cap">
              Daily {deployment.tokenSymbol} cap
            </label>
            <input
              id="altana-token-cap"
              inputMode="decimal"
              value={tokenCap}
              onChange={(event) => setTokenCap(event.target.value)}
              disabled={session?.status === "active"}
              className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:opacity-60"
            />
            <p className="mt-3 text-xs text-muted-foreground">Native gas cap: {formatAltanaGasCap(20_000_000_000_000_000n)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Expiry: one hour after creation</p>
          </div>
        </div>

        {deployment.isMainnet && !session ? (
          <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/8 p-4 text-sm leading-6 text-amber-50">
            <input type="checkbox" className="mt-1 size-4 accent-amber-400" checked={mainnetAccepted} onChange={(event) => setMainnetAccepted(event.target.checked)} />
            <span><strong className="block">I understand this is BSC Mainnet.</strong>Actions may use real BNB and real {deployment.tokenSymbol}. I will review every passkey prompt.</span>
          </label>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {!session || session.status !== "active" ? (
            <Button
              disabled={pending !== null || !altana.walletAddress || (deployment.isMainnet && !mainnetAccepted)}
              onClick={() => run("grant", () => altana.grantHiringSession(chainId, parseCap()), "Permission created and registered in Altana KeyStore.")}
            >
              {pending === "grant" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ShieldCheck className="size-4" aria-hidden="true" />}
              Create protected permission
            </Button>
          ) : (
            <>
              <Button variant="outline" disabled={pending !== null} onClick={() => run("refresh", () => altana.refreshSession(chainId), "Permission checked against Altana KeyStore.")}>
                {pending === "refresh" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}
                Check on-chain status
              </Button>
              <Button variant="outline" disabled={pending !== null} onClick={() => run("revoke", () => altana.revokeHiringSession(chainId), "Permission revoked on-chain.")}>
                {pending === "revoke" ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <ShieldOff className="size-4" aria-hidden="true" />}
                Revoke permission
              </Button>
            </>
          )}
        </div>
      </section>

      {session ? (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">On-chain record</p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">{sessionStatusLabel(session.status)} permission</h2>
            </div>
            <span className={cn("rounded-full border px-3 py-1.5 text-xs font-semibold", session.status === "active" ? "border-emerald-400/25 bg-emerald-400/8 text-emerald-200" : "border-border text-muted-foreground")}>{sessionStatusLabel(session.status)}</span>
          </div>
          <dl className="mt-5 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
            <div className="bg-card p-4"><dt className="text-xs text-muted-foreground">Wallet</dt><dd className="mt-1 break-all font-mono text-xs text-foreground">{session.walletAddress}</dd></div>
            <div className="bg-card p-4"><dt className="text-xs text-muted-foreground">Expires</dt><dd className="mt-1 text-sm text-foreground">{new Date(session.expiry * 1_000).toLocaleString()}</dd></div>
            <div className="bg-card p-4"><dt className="text-xs text-muted-foreground">Token cap</dt><dd className="mt-1 text-sm text-foreground">{formatUnits(BigInt(session.tokenCapBaseUnits), deployment.tokenDecimals)} {deployment.tokenSymbol}</dd></div>
            <div className="bg-card p-4"><dt className="text-xs text-muted-foreground">Key ID</dt><dd className="mt-1 break-all font-mono text-xs text-foreground">{session.keyId}</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-4 text-xs font-semibold">
            <a className="inline-flex items-center gap-1 text-brand hover:underline" href={buildAltanaKeyStoreHref(chainId)} target="_blank" rel="noreferrer noopener">Open KeyStore <ExternalLink className="size-3" aria-hidden="true" /></a>
            {session.grantHash ? <a className="inline-flex items-center gap-1 text-brand hover:underline" href={buildAltanaTransactionHref(chainId, session.grantHash)} target="_blank" rel="noreferrer noopener">Grant transaction <ExternalLink className="size-3" aria-hidden="true" /></a> : null}
            {session.lastHireHash ? <a className="inline-flex items-center gap-1 text-brand hover:underline" href={buildAltanaTransactionHref(chainId, session.lastHireHash)} target="_blank" rel="noreferrer noopener">Latest hire <ExternalLink className="size-3" aria-hidden="true" /></a> : null}
            {session.revokedHash ? <a className="inline-flex items-center gap-1 text-brand hover:underline" href={buildAltanaTransactionHref(chainId, session.revokedHash)} target="_blank" rel="noreferrer noopener">Revoke transaction <ExternalLink className="size-3" aria-hidden="true" /></a> : null}
          </div>
        </section>
      ) : null}

      {notice ? <p role="status" className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">{notice}</p> : null}
      {error ? <HiringErrorNotice error={error} /> : null}
    </div>
  );
}
