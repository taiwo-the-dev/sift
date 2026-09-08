"use client";

import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  Fingerprint,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Hash } from "viem";

import { useAltanaSession } from "@/components/altana/altana-session-provider";
import { HiringErrorNotice } from "@/components/hiring/hiring-error-notice";
import { Button } from "@/components/ui/button";
import { buildAltanaTransactionHref } from "@/features/altana/protocol";
import type { SavedHiringResume } from "@/features/hiring/client-storage";
import { recordRemoteAltanaHire } from "@/features/hiring/client-api";
import {
  describeHiringError,
  type HiringErrorDescription,
} from "@/features/hiring/error-presentation";
import type {
  HiringAgentSummary,
  HiringIntentSnapshot,
} from "@/features/hiring/model";
import { getErc8183Deployment } from "@/features/hiring/protocol";

export function AltanaWalletStep({
  agent,
  intent,
  onIntentChange,
  onRestart,
  resume,
}: Readonly<{
  agent: HiringAgentSummary;
  intent: HiringIntentSnapshot;
  onIntentChange: (intent: HiringIntentSnapshot) => void;
  onRestart: () => void;
  resume: SavedHiringResume;
}>) {
  const deployment = getErc8183Deployment(agent.chainId);
  const altana = useAltanaSession();
  const session = altana.publicSessions[agent.chainId];
  const budget = BigInt(intent.budgetBaseUnits);
  const [approvalReady, setApprovalReady] = useState(budget === 0n);
  const [approvalHash, setApprovalHash] = useState<Hash | null>(null);
  const [hireHash, setHireHash] = useState<Hash | null>(
    session?.lastHireHash ?? null,
  );
  const [busy, setBusy] = useState<"approval" | "hire" | "verify" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<HiringErrorDescription | null>(null);
  const walletMatches =
    altana.walletAddress?.toLowerCase() === intent.walletAddress.toLowerCase();
  const sessionReady =
    walletMatches &&
    session?.status === "active" &&
    session.lastHireHash === undefined &&
    BigInt(session.tokenCapBaseUnits) === budget &&
    altana.hasLiveSession(agent.chainId);

  async function prepareAllowance(): Promise<void> {
    setBusy("approval");
    setError(null);
    setNotice("Approve the exact signed budget with your passkey. This permission is not given to the session.");
    try {
      const result = await altana.approveExactHiringBudget(agent.chainId, budget);
      if (result && result.status !== "CONFIRMED") {
        throw new Error("The exact allowance has not confirmed yet.");
      }
      if (result?.transactionHash) setApprovalHash(result.transactionHash);
      setApprovalReady(true);
      setNotice(
        result
          ? "Exact token allowance confirmed. The protected hire is ready."
          : "The existing allowance already covers this exact budget.",
      );
    } catch (caught) {
      setNotice(null);
      setError(describeHiringError(caught));
    } finally {
      setBusy(null);
    }
  }

  async function verify(hash: Hash): Promise<void> {
    if (!session) return;
    setBusy("verify");
    setError(null);
    setNotice(`Verifying the funded ERC-8183 job and Altana KeyStore record on ${deployment.networkName}…`);
    try {
      const refreshed = await recordRemoteAltanaHire(intent.id, resume.resumeToken, {
        hash,
        sessionExpiry: session.expiry,
        sessionPublicKey: session.publicKey,
      });
      onIntentChange(refreshed);
      setNotice("The protected hire and funded job are confirmed on-chain.");
    } catch (caught) {
      setNotice(null);
      setError(describeHiringError(caught));
    } finally {
      setBusy(null);
    }
  }

  async function hire(): Promise<void> {
    if (!sessionReady) return;
    setBusy("hire");
    setError(null);
    setNotice("Submitting the four permitted ERC-8183 calls as one protected Altana action…");
    try {
      const result = await altana.executeSessionHire(intent);
      if (result.status === "FAILED") {
        throw new Error("Altana rejected the protected hire. No funded job was recorded.");
      }
      if (!result.transactionHash) {
        throw new Error("Altana did not return a transaction hash that Sift can verify.");
      }
      const hash = result.transactionHash;
      setHireHash(hash);
      await verify(hash);
    } catch (caught) {
      setNotice(null);
      setError(describeHiringError(caught));
      setBusy(null);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          Step 4 · Protected confirmation
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Fund the reviewed job with bounded access.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Your passkey controls the payment allowance. The registered session can only submit the four reviewed ERC-8183 hiring calls until it expires or you revoke it.
        </p>
      </div>

      {deployment.isMainnet ? (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-400/35 bg-amber-400/10 px-4 py-4 text-sm leading-6 text-amber-50">
          <CircleAlert className="mt-1 size-4 shrink-0" aria-hidden="true" />
          <p><strong className="block font-semibold">Real funds on BSC Mainnet</strong>This can move real {deployment.tokenSymbol} and use real BNB. Confirm the amount before using your passkey.</p>
        </div>
      ) : null}

      <ol className="space-y-3">
        <li className="rounded-xl border border-border bg-background/45 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                {approvalReady ? <CircleCheck className="size-4 text-emerald-300" aria-hidden="true" /> : <Fingerprint className="size-4 text-brand" aria-hidden="true" />}
                1. Allow the exact payment
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                The passkey approval is limited to the signed job budget, never an unlimited token allowance.
              </p>
            </div>
            <Button type="button" size="sm" onClick={prepareAllowance} disabled={busy !== null || approvalReady || !walletMatches}>
              {busy === "approval" ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : null}
              {approvalReady ? "Allowance ready" : "Approve with passkey"}
            </Button>
          </div>
          {approvalHash ? (
            <a className="mt-3 inline-flex items-center gap-1 text-xs text-brand hover:underline" href={buildAltanaTransactionHref(agent.chainId, approvalHash)} target="_blank" rel="noreferrer noopener">
              View allowance transaction <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : null}
        </li>
        <li className="rounded-xl border border-border bg-background/45 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <ShieldCheck className="size-4 text-brand" aria-hidden="true" />
                2. Submit the protected hire
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create job, register policy, set budget, and fund either all succeed together or all fail.
              </p>
            </div>
            {hireHash ? (
              <Button type="button" size="sm" onClick={() => verify(hireHash)} disabled={busy !== null}>
                {busy === "verify" ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : null}
                Verify transaction
              </Button>
            ) : (
              <Button type="button" size="sm" onClick={hire} disabled={busy !== null || !approvalReady || !sessionReady}>
                {busy === "hire" ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : null}
                Complete protected hire
              </Button>
            )}
          </div>
          {hireHash ? (
            <a className="mt-3 inline-flex items-center gap-1 text-xs text-brand hover:underline" href={buildAltanaTransactionHref(agent.chainId, hireHash)} target="_blank" rel="noreferrer noopener">
              View hire transaction <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : null}
        </li>
      </ol>

      {!sessionReady ? (
        <p className="rounded-xl border border-amber-400/25 bg-amber-400/8 px-4 py-3 text-xs leading-5 text-amber-100">
          The protected session is unavailable or no longer in this browser tab. No private session key was stored. Restart this hire or manage/revoke the public permission record.
        </p>
      ) : null}
      {notice ? <p role="status" className="text-sm leading-6 text-muted-foreground">{notice}</p> : null}
      {error ? <HiringErrorNotice error={error} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <Button type="button" variant="outline" onClick={onRestart} disabled={busy !== null}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Restart hire
        </Button>
        <Link href="/permissions" className="text-xs font-semibold text-brand hover:underline">
          View or revoke permission
        </Link>
      </div>
    </section>
  );
}
