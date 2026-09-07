"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  ExternalLink,
  LoaderCircle,
  Network,
  WalletCards,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type {
  HiringAgentSummary,
  HiringMissionInput,
  HiringQuote,
} from "@/features/hiring/model";
import {
  buildHiringAddressHref,
  getErc8183Deployment,
} from "@/features/hiring/protocol";
import {
  formatBasisPointPercent,
  hiringExpiryLabel,
} from "@/features/hiring/review";
import { shortenWalletAddress } from "@/features/wallet/presentation";

interface ReviewStepProps {
  address: string | undefined;
  agent: HiringAgentSummary;
  chainId: number | undefined;
  error: string | null;
  mission: HiringMissionInput;
  onBack: () => void;
  onContinue: (mainnetRiskAccepted: boolean) => void;
  onSwitchNetwork: () => void;
  pending: boolean;
  quote: HiringQuote;
  switching: boolean;
}

function ReviewRow({
  label,
  value,
}: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="grid gap-1 border-b border-border px-4 py-3 last:border-b-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm leading-6 text-foreground">{value}</dd>
    </div>
  );
}

export function ReviewStep({
  address,
  agent,
  chainId,
  error,
  mission,
  onBack,
  onContinue,
  onSwitchNetwork,
  pending,
  quote,
  switching,
}: ReviewStepProps) {
  const deployment = getErc8183Deployment(agent.chainId);
  const [mainnetRiskAccepted, setMainnetRiskAccepted] = useState(false);
  const connected = Boolean(address);
  const correctNetwork = chainId === deployment.chainId;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          Step 3 · Review
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Review this agent hire before continuing.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          No blockchain transaction is sent until you approve it in your wallet.
        </p>
      </div>

      <dl className="overflow-hidden rounded-xl border border-border bg-card">
        <ReviewRow label="Agent" value={`${agent.name} · ERC-8004 #${agent.agentId}`} />
        <ReviewRow label="Task description" value={mission.mission} />
        <ReviewRow label="Deliverable" value={mission.deliverables} />
        <ReviewRow label="Quality standard" value={mission.qualityStandards} />
        <ReviewRow
          label="Network"
          value={`${deployment.networkName} · chain ${deployment.chainId}`}
        />
        <ReviewRow
          label="Budget"
          value={`${quote.budgetDisplay} ${quote.tokenSymbol} (signed quote)`}
        />
        <ReviewRow
          label="Maximum spend"
          value={`${quote.maximumSpendDisplay} ${quote.tokenSymbol}`}
        />
        <ReviewRow
          label="ERC-8183 job expiry"
          value={hiringExpiryLabel(quote.expiresAt)}
        />
        <ReviewRow
          label="Evaluation window"
          value={`${Math.round(quote.disputeWindowSeconds / 60)} minutes`}
        />
        <ReviewRow
          label="Platform fee"
          value={`${formatBasisPointPercent(quote.platformFeeBasisPoints)} (live contract read)`}
        />
        <ReviewRow
          label="Payment token"
          value={
            <a
              className="inline-flex items-center gap-1.5 break-all underline decoration-border underline-offset-4 hover:text-brand"
              href={buildHiringAddressHref(deployment.chainId, quote.tokenAddress)}
              rel="noreferrer noopener"
              target="_blank"
            >
              {quote.tokenAddress}
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            </a>
          }
        />
        <ReviewRow
          label="Destination"
          value={
            <a
              className="inline-flex items-center gap-1.5 break-all underline decoration-border underline-offset-4 hover:text-brand"
              href={buildHiringAddressHref(deployment.chainId, deployment.commerce)}
              rel="noreferrer noopener"
              target="_blank"
            >
              {deployment.commerce}
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
            </a>
          }
        />
        <ReviewRow
          label="Wallet"
          value={address ? shortenWalletAddress(address) : "Not connected"}
        />
      </dl>

      <div className="rounded-xl border border-sky-400/20 bg-sky-400/7 px-4 py-3 text-xs leading-5 text-sky-100">
        This protocol requires separate job creation, policy registration,
        budget, exact token approval when needed, and funding transactions. Sift
        simulates each call and asks for explicit wallet confirmation each time.
      </div>

      {deployment.isMainnet ? (
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-400/35 bg-amber-400/10 px-4 py-4 text-sm leading-6 text-amber-50">
          <input
            type="checkbox"
            checked={mainnetRiskAccepted}
            className="mt-1 size-4 shrink-0 accent-amber-400"
            onChange={(event) => setMainnetRiskAccepted(event.target.checked)}
          />
          <span>
            <strong className="block font-semibold">
              I understand this is BSC Mainnet.
            </strong>
            This hire uses real BNB for gas and can transfer real {quote.tokenSymbol}
            tokens into the ERC-8183 job. I checked the budget, wallet, token,
            and contract addresses above.
          </span>
        </label>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" size="lg" onClick={onBack} disabled={pending}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back
        </Button>

        <ConnectButton.Custom>
          {({ mounted, openConnectModal }) => {
            if (!mounted) {
              return (
                <Button type="button" size="lg" disabled>
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  Loading wallet
                </Button>
              );
            }

            if (!connected) {
              return (
                <Button type="button" size="lg" onClick={openConnectModal}>
                  <WalletCards className="size-4" aria-hidden="true" />
                  Connect wallet to continue
                </Button>
              );
            }

            if (!correctNetwork) {
              return (
                <Button type="button" size="lg" onClick={onSwitchNetwork} disabled={switching}>
                  {switching ? (
                    <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Network className="size-4" aria-hidden="true" />
                  )}
                  {switching
                    ? "Switching network"
                    : `Switch to ${deployment.networkName}`}
                </Button>
              );
            }

            return (
              <Button
                type="button"
                size="lg"
                onClick={() => onContinue(mainnetRiskAccepted)}
                disabled={pending || (deployment.isMainnet && !mainnetRiskAccepted)}
              >
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <ArrowRight className="size-4" aria-hidden="true" />
                )}
                {pending ? "Saving hiring details" : "Continue to wallet"}
              </Button>
            );
          }}
        </ConnectButton.Custom>
      </div>

      {!correctNetwork && connected ? (
        <p className="flex items-center justify-end gap-2 text-xs text-amber-200">
          <CircleAlert className="size-3.5" aria-hidden="true" />
          This agent must be hired on {deployment.networkName} (chain {deployment.chainId}).
        </p>
      ) : null}
    </section>
  );
}
