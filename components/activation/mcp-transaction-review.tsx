"use client";

import { CheckCircle2, ExternalLink, LoaderCircle, WalletCards } from "lucide-react";
import { useState } from "react";
import { formatEther, type Hash } from "viem";
import {
  useAccount,
  usePublicClient,
  useSendTransaction,
  useSwitchChain,
} from "wagmi";

import { Button } from "@/components/ui/button";
import { buildExplorerTransactionHref } from "@/features/agents/links";
import type { PreparedEvmTransaction } from "@/features/activation/protocol";

function shorten(value: string): string {
  return value.length > 22 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;
}

function PreparedTransaction({
  index,
  transaction,
}: Readonly<{ index: number; transaction: PreparedEvmTransaction }>) {
  const account = useAccount();
  const publicClient = usePublicClient({ chainId: transaction.chainId });
  const sendTransaction = useSendTransaction();
  const switchChain = useSwitchChain();
  const [error, setError] = useState<string | null>(null);
  const [hash, setHash] = useState<Hash | null>(null);
  const [pending, setPending] = useState(false);

  async function reviewInWallet(): Promise<void> {
    setError(null);
    setHash(null);
    if (!account.address) {
      setError("Connect your wallet from the navigation before continuing.");
      return;
    }
    if (
      transaction.from &&
      transaction.from.toLowerCase() !== account.address.toLowerCase()
    ) {
      setError("This action was prepared for a different wallet address.");
      return;
    }
    if (!publicClient) {
      setError("Sift could not connect to the selected BNB network.");
      return;
    }

    setPending(true);
    try {
      if (account.chainId !== transaction.chainId) {
        await switchChain.switchChainAsync({ chainId: transaction.chainId });
      }
      const request = {
        account: account.address,
        data: transaction.data,
        to: transaction.to,
        value: BigInt(transaction.value),
      } as const;
      await publicClient.call(request);
      const nextHash = await sendTransaction.sendTransactionAsync({
        ...request,
        chainId: transaction.chainId,
      });
      setHash(nextHash);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The transaction could not be simulated or opened in your wallet.",
      );
    } finally {
      setPending(false);
    }
  }

  const explorerHref = hash
    ? buildExplorerTransactionHref(transaction.chainId, hash)
    : null;

  return (
    <article className="rounded-xl border border-border bg-background/55 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">
          Transaction {index + 1}
        </p>
        <span className="rounded-full border border-brand/25 bg-brand/8 px-2.5 py-1 text-[0.65rem] font-semibold text-brand">
          BNB Chain · {transaction.chainId}
        </span>
      </div>
      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Contract</dt>
          <dd className="mt-1 font-mono text-foreground" title={transaction.to}>
            {shorten(transaction.to)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Native value</dt>
          <dd className="mt-1 font-mono text-foreground">
            {formatEther(BigInt(transaction.value))} BNB
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Transaction data</dt>
          <dd className="mt-1 truncate font-mono text-foreground" title={transaction.data}>
            {shorten(transaction.data)}
          </dd>
        </div>
      </dl>
      <Button
        type="button"
        className="mt-4"
        variant="brand"
        disabled={pending}
        onClick={reviewInWallet}
      >
        {pending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <WalletCards className="size-4" aria-hidden="true" />
        )}
        Simulate and review in wallet
      </Button>
      {error ? (
        <p role="alert" className="mt-3 break-words text-xs leading-5 text-red-200">
          {error}
        </p>
      ) : null}
      {hash ? (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-emerald-200">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Transaction submitted.
          {explorerHref ? (
            <a
              href={explorerHref}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 font-semibold underline underline-offset-4"
            >
              View on BscScan
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : null}
        </p>
      ) : null}
    </article>
  );
}

export function McpTransactionReview({
  transactions,
}: Readonly<{ transactions: readonly PreparedEvmTransaction[] }>) {
  if (transactions.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border border-brand/25 bg-brand/5 p-4 sm:p-5">
      <h3 className="text-base font-semibold text-foreground">
        Wallet actions prepared by the agent
      </h3>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        Sift validated the transaction shape and BNB network. Each transaction is
        simulated first and only your connected wallet can approve it.
      </p>
      <div className="mt-4 space-y-3">
        {transactions.map((transaction, index) => (
          <PreparedTransaction
            key={`${transaction.to}:${transaction.data}:${index}`}
            index={index}
            transaction={transaction}
          />
        ))}
      </div>
    </section>
  );
}
