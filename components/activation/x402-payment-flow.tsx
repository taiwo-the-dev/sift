"use client";

import type { ClientEvmSigner } from "@x402/evm";
import {
  CheckCircle2,
  CircleDollarSign,
  ExternalLink,
  LoaderCircle,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import type { Address } from "viem";
import { useAccount, useSwitchChain, useWalletClient } from "wagmi";

import { ServiceResponse } from "@/components/activation/service-response";
import { TaskFlowProgress, type TaskFlowStep } from "@/components/activation/task-flow-progress";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { buildExplorerAddressHref, buildExplorerTransactionHref } from "@/features/agents/links";
import type { AgentProfileService } from "@/features/agents/model";
import {
  createBnbX402PaymentPayload,
  type BnbX402Challenge,
} from "@/features/activation/x402";

type StoredQuote = Readonly<{
  amount: string;
  asset: string;
  network: string;
  payTo: string;
}>;

type PreparedPayment = Readonly<{
  challenge: BnbX402Challenge;
  kind: "payment";
  quote: Readonly<{
    amount: string;
    amountAtomic: string;
    asset: Address;
    balance: string;
    balanceAtomic: string;
    chainId: 56 | 97;
    description: string | null;
    hasEnoughBalance: boolean;
    maxTimeoutSeconds: number;
    network: string;
    payTo: Address;
    protocolVersion: 1 | 2;
    symbol: string;
  }>;
}>;

type FreeResource = Readonly<{ kind: "free"; resource: unknown }>;
type PaymentResult = Readonly<{ resource: unknown; settlement: unknown | null }>;

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function storedQuotes(service: AgentProfileService): readonly StoredQuote[] {
  const summary = record(service.capabilitySummary);
  if (!summary || !Array.isArray(summary.options)) return [];
  return summary.options.flatMap((item) => {
    const option = record(item);
    return option &&
      typeof option.amount === "string" &&
      typeof option.asset === "string" &&
      typeof option.network === "string" &&
      typeof option.payTo === "string"
      ? [{
          amount: option.amount,
          asset: option.asset,
          network: option.network,
          payTo: option.payTo,
        }]
      : [];
  });
}

function shortAddress(value: string): string {
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

async function readApiResult(response: Response): Promise<unknown> {
  const value = (await response.json()) as Readonly<{
    error?: unknown;
    result?: unknown;
  }>;
  if (!response.ok) {
    throw new Error(
      typeof value.error === "string" ? value.error : "The payment request failed.",
    );
  }
  return value.result;
}

function isPreparedPayment(value: unknown): value is PreparedPayment {
  const candidate = record(value);
  return candidate?.kind === "payment" && record(candidate.quote) !== null;
}

function isFreeResource(value: unknown): value is FreeResource {
  return record(value)?.kind === "free";
}

export function X402PaymentFlow({
  chainId,
  service,
}: Readonly<{
  chainId: number;
  service: AgentProfileService;
}>) {
  const account = useAccount();
  const walletClient = useWalletClient();
  const switchChain = useSwitchChain();
  const quotes = storedQuotes(service);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [step, setStep] = useState<TaskFlowStep>("details");
  const [prepared, setPrepared] = useState<PreparedPayment | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PaymentResult | FreeResource | null>(null);
  const selectedQuote = quotes[quoteIndex] ?? quotes[0] ?? null;

  async function prepare(): Promise<void> {
    if (!account.address) {
      setError("Connect your wallet from the navigation before continuing.");
      return;
    }
    if (!service.id) {
      setError("This payment service is missing its indexed service ID.");
      return;
    }
    setBusy(true);
    setError(null);
    setPrepared(null);
    setResult(null);
    try {
      const response = await fetch("/api/activation/x402/prepare", {
        body: JSON.stringify({
          ...(selectedQuote
            ? {
                preference: {
                  asset: selectedQuote.asset,
                  network: selectedQuote.network,
                  payTo: selectedQuote.payTo,
                },
              }
            : {}),
          serviceId: service.id,
          walletAddress: account.address,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await readApiResult(response);
      if (isFreeResource(payload)) {
        setResult(payload);
        setStep("result");
        return;
      }
      if (!isPreparedPayment(payload)) {
        throw new Error("The provider returned an invalid payment request.");
      }
      setPrepared(payload);
      setStep("review");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The quote could not be refreshed.");
    } finally {
      setBusy(false);
    }
  }

  async function payAndRequest(): Promise<void> {
    if (!prepared || !account.address || !walletClient.data || !service.id) {
      setError("Connect your wallet before approving this payment.");
      return;
    }
    if (!confirmed) {
      setError("Confirm the exact payment before continuing.");
      return;
    }
    if (!prepared.quote.hasEnoughBalance) {
      setError(`This wallet does not have enough ${prepared.quote.symbol}.`);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (account.chainId !== prepared.quote.chainId) {
        await switchChain.switchChainAsync({ chainId: prepared.quote.chainId });
      }
      const connectedClient = walletClient.data;
      const signer: ClientEvmSigner = {
        address: account.address,
        signTypedData: async (request) =>
          connectedClient.signTypedData({
            account: account.address,
            domain: request.domain,
            message: request.message,
            primaryType: request.primaryType,
            types: request.types,
          }),
      };
      const paymentPayload = await createBnbX402PaymentPayload(
        prepared.challenge,
        signer,
        prepared.quote.chainId,
      );
      const response = await fetch("/api/activation/x402/execute", {
        body: JSON.stringify({
          paymentPayload,
          serviceId: service.id,
          walletAddress: account.address,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = await readApiResult(response);
      const responseRecord = record(payload);
      if (!("resource" in (responseRecord ?? {}))) {
        throw new Error("The provider did not return a paid result.");
      }
      setResult({
        resource: responseRecord!.resource,
        settlement: responseRecord!.settlement ?? null,
      });
      setStep("result");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The wallet payment could not be completed.",
      );
    } finally {
      setBusy(false);
    }
  }

  function startAgain(): void {
    setPrepared(null);
    setConfirmed(false);
    setError(null);
    setResult(null);
    setStep("details");
  }

  const settlement = record(
    result && "settlement" in result ? result.settlement : null,
  );
  const transaction =
    typeof settlement?.transaction === "string" ? settlement.transaction : null;
  const explorerHref = transaction
    ? buildExplorerTransactionHref(chainId, transaction)
    : null;
  const tokenHref = prepared
    ? buildExplorerAddressHref(prepared.quote.chainId, prepared.quote.asset)
    : null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">
        Pay for one request
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-foreground">
        Request the agent&apos;s paid result
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Sift refreshes the price, shows the exact token payment, and asks your
        wallet before the provider can collect it.
      </p>
      <TaskFlowProgress step={step} />

      {step === "details" ? (
        <div>
          {quotes.length > 1 ? (
            <SelectField
              label="Payment option"
              onValueChange={(value) => {
                setQuoteIndex(Number(value));
                setError(null);
              }}
              options={quotes.map((quote, index) => ({
                label: `${quote.network} · option ${index + 1}`,
                value: String(index),
              }))}
              value={String(quoteIndex)}
            />
          ) : null}
          <div className="mt-5 border-l-2 border-brand/50 py-1 pl-4">
            <p className="text-sm font-semibold text-foreground">Live price check</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              The stored availability check is only a preview. Continue to fetch
              the provider&apos;s current amount and your token balance.
            </p>
          </div>
          <Button
            type="button"
            className="mt-5"
            variant="brand"
            size="lg"
            disabled={busy}
            onClick={prepare}
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <CircleDollarSign className="size-4" aria-hidden="true" />
            )}
            Check current price
          </Button>
        </div>
      ) : null}

      {step === "review" && prepared ? (
        <div>
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <p className="text-xs text-muted-foreground">Exact payment</p>
              <p className="mt-1 text-3xl font-semibold tracking-[-0.04em] text-foreground">
                {prepared.quote.amount} {prepared.quote.symbol}
              </p>
            </div>
            <span className="rounded-full border border-brand/30 bg-brand/8 px-3 py-1.5 text-xs font-semibold text-brand">
              x402 v{prepared.quote.protocolVersion}
            </span>
          </div>
          {prepared.quote.description ? (
            <p className="mt-5 border-l-2 border-brand/50 py-1 pl-4 text-sm leading-6 text-muted-foreground">
              {prepared.quote.description}
            </p>
          ) : null}
          <dl className="mt-5 grid gap-x-6 gap-y-4 rounded-xl border border-border bg-background/45 p-4 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Network</dt>
              <dd className="mt-1 font-medium text-foreground">BNB Smart Chain · {prepared.quote.chainId}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Wallet balance</dt>
              <dd className="mt-1 font-medium text-foreground">
                {prepared.quote.balance} {prepared.quote.symbol}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Payment token</dt>
              <dd className="mt-1 font-mono text-foreground">
                {tokenHref ? (
                  <a className="inline-flex items-center gap-1 hover:text-brand" href={tokenHref} target="_blank" rel="noreferrer noopener">
                    {shortAddress(prepared.quote.asset)}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ) : shortAddress(prepared.quote.asset)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Recipient</dt>
              <dd className="mt-1 font-mono text-foreground">{shortAddress(prepared.quote.payTo)}</dd>
            </div>
          </dl>
          {!prepared.quote.hasEnoughBalance ? (
            <p role="alert" className="mt-4 rounded-xl border border-red-400/25 bg-red-400/8 p-4 text-xs leading-5 text-red-200">
              This wallet needs {prepared.quote.amount} {prepared.quote.symbol}, but
              its current balance is {prepared.quote.balance} {prepared.quote.symbol}.
            </p>
          ) : null}
          <label className="mt-4 flex items-start gap-3 rounded-xl border border-amber-400/25 bg-amber-400/6 p-4 text-xs leading-5 text-muted-foreground">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => {
                setConfirmed(event.target.checked);
                setError(null);
              }}
              className="mt-1 accent-brand"
            />
            <span>
              I approve one exact payment of {prepared.quote.amount} {prepared.quote.symbol} to this recipient. The authorization expires in at most {prepared.quote.maxTimeoutSeconds} seconds.
            </span>
          </label>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="button" variant="outline" size="lg" disabled={busy} onClick={startAgain}>
              Back to details
            </Button>
            <Button
              type="button"
              variant="brand"
              size="lg"
              disabled={busy || !confirmed || !prepared.quote.hasEnoughBalance}
              onClick={payAndRequest}
            >
              {busy ? (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <WalletCards className="size-4" aria-hidden="true" />
              )}
              Approve payment and run
            </Button>
          </div>
        </div>
      ) : null}

      {step === "result" && result ? (
        <div>
          <div className="flex items-start gap-3 border-l-2 border-emerald-400/60 py-1 pl-4">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-300" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {"settlement" in result ? "The provider returned the paid result." : "The resource is currently free."}
              </p>
              {"settlement" in result && !result.settlement ? (
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  The provider did not include a settlement receipt header. Sift will not invent one.
                </p>
              ) : null}
              {explorerHref ? (
                <a href={explorerHref} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                  View payment on BscScan
                  <ExternalLink className="size-3" aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </div>
          <ServiceResponse value={result.resource} />
          <Button type="button" className="mt-7" variant="outline" size="lg" onClick={startAgain}>
            Start another request
          </Button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-6 rounded-xl border border-red-400/25 bg-red-400/8 p-4 text-sm leading-6 text-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
