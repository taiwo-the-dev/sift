"use client";

import { LoaderCircle, RefreshCw, WalletCards } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  createPublicClient,
  formatEther,
  formatUnits,
  http,
  type Address,
} from "viem";
import { bsc, bscTestnet } from "viem/chains";

import { CopyButton } from "@/components/agents/copy-button";
import { Button } from "@/components/ui/button";
import {
  altanaKeyStoreControllerAbi,
  getAltanaNetwork,
} from "@/features/altana/protocol";
import {
  getErc8183Deployment,
  paymentTokenAbi,
  type HiringChainId,
} from "@/features/hiring/protocol";

type BalanceState = Readonly<{
  bnb: bigint;
  registrationFee: bigint;
  token: bigint;
}>;

function formatBalance(value: bigint, decimals: number, maximumDecimals: number): string {
  const [whole, fraction = ""] = formatUnits(value, decimals).split(".");
  const visibleFraction = fraction.slice(0, maximumDecimals).replace(/0+$/, "");
  return visibleFraction ? `${whole}.${visibleFraction}` : whole;
}

export function AltanaWalletFunding({
  address,
  chainId,
}: Readonly<{ address: Address; chainId: HiringChainId }>) {
  const network = getAltanaNetwork(chainId);
  const deployment = getErc8183Deployment(chainId);
  const balanceQuery = useQuery<BalanceState>({
    queryKey: ["altana-wallet-balances", address, chainId],
    queryFn: async () => {
      const client = createPublicClient({
        chain: chainId === 56 ? bsc : bscTestnet,
        transport: http(network.publicRpcUrl),
      });
      const [bnbBalance, tokenBalance, registrationFee] = await Promise.all([
        client.getBalance({ address }),
        client.readContract({
          abi: paymentTokenAbi,
          address: deployment.paymentToken,
          args: [address],
          functionName: "balanceOf",
        }),
        client.readContract({
          abi: altanaKeyStoreControllerAbi,
          address: network.keyStoreController,
          functionName: "getRegistrationFeeInWei",
        }),
      ]);
      return { bnb: bnbBalance, registrationFee, token: tokenBalance };
    },
    retry: 1,
    staleTime: 15_000,
  });
  const balance = balanceQuery.data ?? null;
  const loading = balanceQuery.isFetching;

  return (
    <div className="mt-5 rounded-xl border border-border bg-background/45 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <WalletCards className="size-4 text-brand" aria-hidden="true" />
            Fund your passkey wallet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{network.networkName}</p>
        </div>
        <Button size="sm" type="button" variant="outline" disabled={loading} onClick={() => void balanceQuery.refetch()}>
          {loading ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
          Check balances
        </Button>
      </div>
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5">
        <code className="min-w-0 flex-1 break-all font-mono text-xs text-foreground">{address}</code>
        <CopyButton label="passkey wallet address" value={address} />
      </div>
      <dl className="mt-3 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        <div className="bg-card p-3"><dt className="text-[0.65rem] text-muted-foreground">BNB for network fees</dt><dd className="mt-1 text-sm font-semibold text-foreground">{balance ? formatBalance(balance.bnb, 18, 5) : "—"} BNB</dd></div>
        <div className="bg-card p-3"><dt className="text-[0.65rem] text-muted-foreground">{deployment.tokenSymbol} for the job</dt><dd className="mt-1 text-sm font-semibold text-foreground">{balance ? formatBalance(balance.token, deployment.tokenDecimals, 4) : "—"} {deployment.tokenSymbol}</dd></div>
        <div className="bg-card p-3"><dt className="text-[0.65rem] text-muted-foreground">Permission registration fee</dt><dd className="mt-1 text-sm font-semibold text-foreground">{balance ? `${formatEther(balance.registrationFee)} BNB` : "—"}</dd></div>
      </dl>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        You need BNB for network and permission fees, plus enough {deployment.tokenSymbol} for the signed job price. Send funds only on {network.networkName}.
      </p>
      {!deployment.isMainnet ? (
        <div className="mt-3 flex flex-wrap gap-4 text-xs font-semibold">
          <a className="text-brand hover:underline" href="https://www.bnbchain.org/en/testnet-faucet" target="_blank" rel="noreferrer noopener">Get test BNB</a>
          <a className="text-brand hover:underline" href="https://united-coin-u.github.io/u-faucet/" target="_blank" rel="noreferrer noopener">Get test U</a>
        </div>
      ) : (
        <p className="mt-3 text-xs font-semibold text-amber-200">Mainnet uses real assets. Send a small test amount first.</p>
      )}
      {balanceQuery.isError ? <p role="status" className="mt-3 text-xs text-amber-200">Balances could not be loaded. Your address is still safe to copy; try again shortly.</p> : null}
    </div>
  );
}
