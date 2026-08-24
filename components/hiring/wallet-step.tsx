"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  Clock3,
  ExternalLink,
  LoaderCircle,
  Network,
  RotateCw,
  ShieldCheck,
  UserRoundCog,
  WalletCards,
} from "lucide-react";
import { useMemo, useState } from "react";
import { getAddress, type Hash } from "viem";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi";

import { Button } from "@/components/ui/button";
import {
  loadRemoteHiringIntent,
  recordRemoteClientState,
  recordRemoteHiringTransaction,
} from "@/features/hiring/client-api";
import type {
  HiringAgentSummary,
  HiringIntentSnapshot,
} from "@/features/hiring/model";
import {
  commerceAbi,
  emptyBytes,
  erc8183Deployment,
  evaluatorRouterAbi,
  HIRING_CHAIN_ID,
  HIRING_CONFIRMATIONS,
  paymentTokenAbi,
  buildTestnetTransactionHref,
  type HiringTransactionStep,
} from "@/features/hiring/protocol";
import {
  canRestartHiringIntent,
  describeTransactionStep,
} from "@/features/hiring/state";
import { shortenWalletAddress } from "@/features/wallet/presentation";
import type { SavedHiringResume } from "@/features/hiring/client-storage";
import { cn } from "@/lib/utils";

interface WalletStepProps {
  agent: HiringAgentSummary;
  intent: HiringIntentSnapshot;
  onIntentChange: (intent: HiringIntentSnapshot) => void;
  onRestart: () => void;
  resume: SavedHiringResume;
}

const orderedSteps: readonly HiringTransactionStep[] = [
  "create_job",
  "register_job",
  "set_budget",
  "approve_token",
  "fund_job",
];

function safeWalletFailure(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as Readonly<{
      code?: unknown;
      message?: unknown;
      shortMessage?: unknown;
    }>;
    const detail =
      typeof candidate.shortMessage === "string"
        ? candidate.shortMessage
        : typeof candidate.message === "string"
          ? candidate.message
          : "";
    const normalized = detail.toLowerCase();

    if (
      candidate.code === 4001 ||
      normalized.includes("user rejected") ||
      normalized.includes("user denied")
    ) {
      return "Wallet request cancelled. No new transaction was submitted.";
    }

    if (normalized.includes("insufficient funds")) {
      return "The wallet does not have enough testnet BNB to pay transaction gas.";
    }

    if (normalized.includes("insufficient u test token")) {
      return "The wallet does not have enough U test tokens to fund the signed budget.";
    }
  }

  return "The transaction could not be simulated or submitted. Check the wallet network, balances, and agent quote, then try again.";
}

function unixSeconds(timestamp: string): bigint {
  return BigInt(Math.floor(new Date(timestamp).getTime() / 1_000));
}

export function WalletStep({
  agent,
  intent,
  onIntentChange,
  onRestart,
  resume,
}: WalletStepProps) {
  const account = useAccount();
  const publicClient = usePublicClient({ chainId: HIRING_CHAIN_ID });
  const walletClient = useWalletClient({ chainId: HIRING_CHAIN_ID });
  const switchChain = useSwitchChain();
  const [busy, setBusy] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const currentStep = intent.currentStep;
  const currentTransaction = useMemo(
    () =>
      currentStep
        ? intent.transactions.find((transaction) => transaction.step === currentStep) ?? null
        : null,
    [currentStep, intent.transactions],
  );
  const completed = new Set(
    intent.transactions
      .filter((transaction) => transaction.status === "confirmed")
      .map((transaction) => transaction.step),
  );
  const walletMatches =
    account.address?.toLowerCase() === intent.walletAddress.toLowerCase();
  const correctNetwork = account.chainId === HIRING_CHAIN_ID;
  const restartAllowed = canRestartHiringIntent(intent);
  const pendingHash =
    currentTransaction?.status === "submitted" ||
    currentTransaction?.status === "replaced"
      ? currentTransaction.hash
      : null;

  async function writeCurrentStep(step: HiringTransactionStep): Promise<Hash> {
    if (!account.address || !publicClient || !walletClient.data) {
      throw new Error("Wallet client unavailable");
    }

    const accountAddress = getAddress(account.address);
    const budget = BigInt(intent.budgetBaseUnits);

    if (step === "create_job") {
      const simulation = await publicClient.simulateContract({
        account: accountAddress,
        address: erc8183Deployment.commerce,
        abi: commerceAbi,
        functionName: "createJob",
        args: [
          intent.providerAddress,
          erc8183Deployment.router,
          unixSeconds(intent.expiresAt),
          intent.onchainDescription,
          erc8183Deployment.router,
        ],
      });
      return walletClient.data.writeContract(simulation.request);
    }

    if (!intent.onchainJobId) {
      throw new Error("The verified on-chain job identifier is unavailable.");
    }

    const jobId = BigInt(intent.onchainJobId);

    if (step === "register_job") {
      const simulation = await publicClient.simulateContract({
        account: accountAddress,
        address: erc8183Deployment.router,
        abi: evaluatorRouterAbi,
        functionName: "registerJob",
        args: [jobId, erc8183Deployment.policy],
      });
      return walletClient.data.writeContract(simulation.request);
    }

    if (step === "set_budget") {
      const simulation = await publicClient.simulateContract({
        account: accountAddress,
        address: erc8183Deployment.commerce,
        abi: commerceAbi,
        functionName: "setBudget",
        args: [jobId, budget, emptyBytes],
      });
      return walletClient.data.writeContract(simulation.request);
    }

    if (step === "approve_token") {
      const simulation = await publicClient.simulateContract({
        account: accountAddress,
        address: erc8183Deployment.paymentToken,
        abi: paymentTokenAbi,
        functionName: "approve",
        args: [erc8183Deployment.commerce, budget],
      });
      return walletClient.data.writeContract(simulation.request);
    }

    if (budget > 0n) {
      const balance = await publicClient.readContract({
        address: erc8183Deployment.paymentToken,
        abi: paymentTokenAbi,
        functionName: "balanceOf",
        args: [accountAddress],
      });

      if (balance < budget) {
        throw new Error("Insufficient U test token balance");
      }
    }

    const simulation = await publicClient.simulateContract({
      account: accountAddress,
      address: erc8183Deployment.commerce,
      abi: commerceAbi,
      functionName: "fund",
      args: [jobId, budget, emptyBytes],
    });
    return walletClient.data.writeContract(simulation.request);
  }

  async function verifyExistingTransaction(hash: Hash): Promise<void> {
    if (!currentStep) return;

    setBusy(true);
    setNotice("Checking BSC Testnet for the saved transaction and required confirmations…");

    try {
      const refreshed = await recordRemoteHiringTransaction(
        intent.id,
        resume.resumeToken,
        { hash, step: currentStep },
      );
      onIntentChange(refreshed);
      setNotice(
        refreshed.status === "confirmed"
          ? "Funding confirmed on BSC Testnet."
          : refreshed.currentStep !== currentStep
            ? "Transaction confirmed. The next wallet step is ready."
            : "The transaction is still pending or waiting for confirmations.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sift could not verify the transaction yet.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCurrentTransaction(): Promise<void> {
    if (!currentStep || !account.address || !publicClient || !walletClient.data) {
      return;
    }

    setBusy(true);
    setNotice("Simulating the exact contract call before opening your wallet…");

    try {
      if (intent.status === "cancelled" || intent.status === "failed") {
        const reopened = await recordRemoteClientState(
          intent.id,
          resume.resumeToken,
          "awaiting_wallet",
        );
        onIntentChange(reopened);
      }

      const originalHash = await writeCurrentStep(currentStep);
      let finalHash = originalHash;
      let replacedHash: Hash | null = null;

      setNotice("Transaction submitted. Waiting for two BSC Testnet confirmations…");

      try {
        const submitted = await recordRemoteHiringTransaction(
          intent.id,
          resume.resumeToken,
          { hash: originalHash, step: currentStep },
        );
        onIntentChange(submitted);
      } catch {
        // The wallet RPC can propagate a fresh hash before the server RPC sees it.
        // Receipt verification below will retry without asking for another signature.
      }

      await publicClient.waitForTransactionReceipt({
        confirmations: HIRING_CONFIRMATIONS,
        hash: originalHash,
        onReplaced(replacement) {
          finalHash = replacement.transaction.hash;
          replacedHash = originalHash;
          setNotice(
            replacement.reason === "cancelled"
              ? "The wallet replaced this transaction with a cancellation. Verifying the replacement…"
              : "The wallet replaced this transaction. Verifying the final hash…",
          );
        },
        timeout: 180_000,
      });

      const refreshed = await recordRemoteHiringTransaction(
        intent.id,
        resume.resumeToken,
        { hash: finalHash, replacedHash, step: currentStep },
      );
      onIntentChange(refreshed);
      setNotice(
        refreshed.status === "confirmed"
          ? "Job funding is confirmed."
          : "Transaction confirmed. Review the next exact wallet action.",
      );
    } catch (error) {
      const message = safeWalletFailure(error);
      setNotice(message);

      if (message.startsWith("Wallet request cancelled")) {
        try {
          const cancelled = await recordRemoteClientState(
            intent.id,
            resume.resumeToken,
            "cancelled",
            message,
          );
          onIntentChange(cancelled);
        } catch {
          // Preserve the actionable local wallet message if persistence is unavailable.
        }
      }
    } finally {
      setBusy(false);
    }
  }

  async function refreshIntent(): Promise<void> {
    setBusy(true);
    try {
      const refreshed = await loadRemoteHiringIntent(intent.id, resume.resumeToken);
      onIntentChange(refreshed);
      setNotice("Saved hiring state refreshed.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sift could not refresh the saved state.");
    } finally {
      setBusy(false);
    }
  }

  async function restartWithConnectedWallet(): Promise<void> {
    if (!restartAllowed) return;

    setBusy(true);
    setNotice(null);

    try {
      await recordRemoteClientState(
        intent.id,
        resume.resumeToken,
        "cancelled",
        "Untouched hiring intent cancelled before changing wallets.",
      );
      onRestart();
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Sift could not safely cancel this untouched intent.",
      );
      setConfirmRestart(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
          Step 4 · Wallet confirmation
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Confirm one exact action at a time.
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Sift simulates every call, your wallet shows the request, and the server
          verifies its receipt before unlocking the next action.
        </p>
      </div>

      <ol className="grid gap-2 sm:grid-cols-5">
        {orderedSteps.map((step, index) => {
          const skipped = step === "approve_token" &&
            intent.currentStep !== "approve_token" &&
            !intent.transactions.some((transaction) => transaction.step === "approve_token") &&
            (completed.has("set_budget") || completed.has("fund_job"));
          const done = completed.has(step) || skipped;
          const active = currentStep === step;
          return (
            <li
              key={step}
              className={cn(
                "rounded-lg border px-3 py-3 text-xs",
                active
                  ? "border-brand/50 bg-brand/8 text-foreground"
                  : done
                    ? "border-emerald-400/20 bg-emerald-400/6 text-emerald-100"
                    : "border-border bg-background/35 text-muted-foreground",
              )}
            >
              <span className="flex items-center gap-1.5 font-semibold">
                {done ? (
                  <CircleCheck className="size-3.5 text-emerald-300" aria-hidden="true" />
                ) : (
                  <span className="text-[0.65rem] text-muted-foreground">{index + 1}</span>
                )}
                {step === "approve_token" && skipped
                  ? "Approval not needed"
                  : describeTransactionStep(step)}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="rounded-xl border border-border bg-background/45 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Current action</p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {currentStep ? describeTransactionStep(currentStep) : "Waiting for final verification"}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Connected wallet must remain {shortenWalletAddress(intent.walletAddress)} on BSC Testnet.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-brand" aria-hidden="true" />
            Server-verified receipts
          </span>
        </div>

        {currentTransaction ? (
          <a
            className="mt-4 inline-flex max-w-full items-center gap-1.5 break-all text-xs text-foreground underline decoration-border underline-offset-4 hover:text-brand"
            href={buildTestnetTransactionHref(currentTransaction.hash)}
            rel="noreferrer noopener"
            target="_blank"
          >
            {currentTransaction.hash}
            <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
          </a>
        ) : null}
      </div>

      {!walletMatches && account.address ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-400/25 bg-amber-400/8 px-4 py-4 text-sm text-amber-100"
        >
          <div className="flex items-start gap-2">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                This intent belongs to another wallet.
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-100/75">
                Reconnect {shortenWalletAddress(intent.walletAddress)} to
                continue. The connected wallet{" "}
                {shortenWalletAddress(account.address)} cannot sign for that
                saved job.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <ConnectButton.Custom>
              {({ mounted, openAccountModal }) => (
                <Button
                  type="button"
                  variant="outline"
                  disabled={!mounted || busy}
                  onClick={openAccountModal}
                  className="border-amber-300/25 bg-transparent text-amber-50 hover:bg-amber-300/10"
                >
                  <UserRoundCog className="size-4" aria-hidden="true" />
                  Open wallet account menu
                </Button>
              )}
            </ConnectButton.Custom>
            {restartAllowed ? (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setConfirmRestart(true)}
                className="text-amber-50 hover:bg-amber-300/10"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                Restart with connected wallet
              </Button>
            ) : null}
          </div>

          {!restartAllowed ? (
            <p className="mt-3 text-xs leading-5 text-amber-100/70">
              Restart is disabled because this intent already has submitted or
              confirmed blockchain activity. Switch back to the original wallet
              to avoid abandoning or duplicating the on-chain job.
            </p>
          ) : null}
        </div>
      ) : null}

      {confirmRestart ? (
        <div className="rounded-xl border border-border bg-background/60 p-4">
          <p className="text-sm font-semibold text-foreground">
            Restart this untouched hiring flow?
          </p>
          <p className="mt-1.5 text-xs leading-5 text-muted-foreground">
            No blockchain transaction exists for this intent. Sift will cancel
            only the saved database intent, keep your mission text in the form,
            and request a fresh signed quote for the currently connected wallet.
          </p>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirmRestart(false)}
            >
              Keep current intent
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={restartWithConnectedWallet}
            >
              {busy ? (
                <LoaderCircle
                  className="size-4 animate-spin"
                  aria-hidden="true"
                />
              ) : (
                <ArrowLeft className="size-4" aria-hidden="true" />
              )}
              Cancel intent and restart
            </Button>
          </div>
        </div>
      ) : null}

      {notice ? (
        <p aria-live="polite" className="flex items-start gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">
          {busy ? (
            <LoaderCircle className="mt-1 size-4 shrink-0 animate-spin text-brand" aria-hidden="true" />
          ) : (
            <Clock3 className="mt-1 size-4 shrink-0 text-brand" aria-hidden="true" />
          )}
          {notice}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {restartAllowed && walletMatches ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            disabled={busy}
            onClick={() => setConfirmRestart(true)}
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Edit mission or change wallet
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="lg" onClick={refreshIntent} disabled={busy}>
          <RotateCw className="size-4" aria-hidden="true" />
          Refresh saved state
        </Button>

        <ConnectButton.Custom>
          {({ mounted, openConnectModal }) => {
            if (!mounted) {
              return <Button type="button" size="lg" disabled>Loading wallet</Button>;
            }

            if (!account.address) {
              return (
                <Button type="button" size="lg" onClick={openConnectModal}>
                  <WalletCards className="size-4" aria-hidden="true" />
                  Reconnect wallet
                </Button>
              );
            }

            if (!correctNetwork) {
              return (
                <Button
                  type="button"
                  size="lg"
                  disabled={switchChain.isPending || !walletMatches}
                  onClick={() => switchChain.switchChain({ chainId: HIRING_CHAIN_ID })}
                >
                  <Network className="size-4" aria-hidden="true" />
                  Switch to BSC Testnet
                </Button>
              );
            }

            if (pendingHash) {
              return (
                <Button
                  type="button"
                  size="lg"
                  disabled={busy || !walletMatches}
                  onClick={() => verifyExistingTransaction(pendingHash)}
                >
                  {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <RotateCw className="size-4" aria-hidden="true" />}
                  Check transaction status
                </Button>
              );
            }

            return (
              <Button
                type="button"
                size="lg"
                disabled={busy || !walletMatches || !currentStep}
                onClick={submitCurrentTransaction}
              >
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <WalletCards className="size-4" aria-hidden="true" />
                )}
                {busy
                  ? "Waiting for wallet"
                  : currentStep
                    ? `Approve: ${describeTransactionStep(currentStep)}`
                    : "Waiting for confirmation"}
              </Button>
            );
          }}
        </ConnectButton.Custom>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        Agent: {agent.name}. Sift never asks for a seed phrase, private key, or
        unlimited token approval. An exact approval appears only when the live
        allowance is below the signed budget.
      </p>
    </section>
  );
}
