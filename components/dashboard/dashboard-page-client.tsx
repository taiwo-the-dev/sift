"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useQuery } from "@tanstack/react-query";
import {
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  Network,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { useAccount, useSignMessage, useSwitchChain } from "wagmi";

import { DashboardView } from "@/components/dashboard/dashboard-view";
import { Button } from "@/components/ui/button";
import {
  authorizeDashboard,
  DashboardApiError,
  loadDashboard,
  requestDashboardChallenge,
} from "@/features/dashboard/client-api";
import { shouldPollDashboard } from "@/features/dashboard/derive";
import { HIRING_CHAIN_ID } from "@/features/hiring/protocol";
import { mapWalletError } from "@/features/wallet/presentation";
import { defaultWalletChain } from "@/lib/blockchain/chains";

type ActionState = Readonly<{
  address: string;
  error: string | null;
  pending: boolean;
}>;

export function DashboardLoadingState() {
  return (
    <div role="status" aria-label="Loading wallet dashboard" className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-36 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
      <div className="h-16 animate-pulse rounded-xl border border-border bg-card" />
      <div className="h-80 animate-pulse rounded-xl border border-border bg-card" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function DashboardStateCard({
  children,
  description,
  icon: Icon,
  title,
}: Readonly<{
  children?: React.ReactNode;
  description: string;
  icon: typeof WalletCards;
  title: string;
}>) {
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-12 text-center sm:px-8 sm:py-16">
      <span className="mx-auto grid size-12 place-items-center rounded-xl border border-brand/20 bg-brand/8 text-brand">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <h2 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-foreground">{title}</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{description}</p>
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">{children}</div>
    </div>
  );
}

function DashboardConnected({ mounted }: Readonly<{ mounted: boolean }>) {
  const account = useAccount();
  const signMessage = useSignMessage();
  const switchChain = useSwitchChain();
  const address = account.address;
  const actionContext = address ?? "disconnected";
  const [action, setAction] = useState<ActionState>({
    address: actionContext,
    error: null,
    pending: false,
  });
  const actionState = action.address === actionContext
    ? action
    : { address: actionContext, error: null, pending: false };
  const canLoad =
    mounted &&
    account.status === "connected" &&
    Boolean(address) &&
    account.chainId === HIRING_CHAIN_ID;
  const dashboardQuery = useQuery({
    enabled: canLoad,
    queryFn: () => loadDashboard(address!),
    queryKey: ["wallet-dashboard", address, HIRING_CHAIN_ID],
    refetchInterval(query) {
      const dashboard = query.state.data?.dashboard;
      return dashboard && shouldPollDashboard(dashboard.jobs) ? 15_000 : false;
    },
    refetchIntervalInBackground: false,
    retry(failureCount, error) {
      return error instanceof DashboardApiError
        ? error.status !== 401 && failureCount < 1
        : failureCount < 1;
    },
  });

  async function verifyWallet(): Promise<void> {
    if (!address || account.chainId !== HIRING_CHAIN_ID) return;
    setAction({ address, error: null, pending: true });

    try {
      const challenge = await requestDashboardChallenge(address);
      if (challenge.walletAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error("The dashboard challenge does not match the connected wallet.");
      }
      const signature = await signMessage.signMessageAsync({
        message: challenge.message,
      });
      const session = await authorizeDashboard(signature);
      if (session.walletAddress.toLowerCase() !== address.toLowerCase()) {
        throw new Error("The verified dashboard session does not match the connected wallet.");
      }
      setAction({ address, error: null, pending: false });
      await dashboardQuery.refetch();
    } catch (error) {
      const message =
        error instanceof DashboardApiError
          ? error.message
          : error instanceof Error && /reject|denied|cancel/i.test(error.message)
            ? "The signature request was cancelled. Nothing was submitted on-chain."
            : "Sift could not verify this wallet. Check the wallet and try again.";
      setAction({ address, error: message, pending: false });
    }
  }

  if (!mounted || account.status === "connecting" || account.status === "reconnecting") {
    return <DashboardLoadingState />;
  }

  if (account.status !== "connected" || !address) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <DashboardStateCard
            icon={WalletCards}
            title="Connect your hiring wallet"
            description="Connect the wallet used to hire agents and view its task history."
          >
            <Button type="button" variant="brand" size="lg" onClick={openConnectModal}>
              <WalletCards className="size-4" aria-hidden="true" />
              Connect wallet
            </Button>
          </DashboardStateCard>
        )}
      </ConnectButton.Custom>
    );
  }

  if (account.chainId !== HIRING_CHAIN_ID) {
    const networkError = switchChain.error
      ? mapWalletError(switchChain.error)
      : null;

    return (
      <DashboardStateCard
        icon={Network}
        title="Switch to BSC Testnet"
        description="Agent hiring and task records are currently available on BSC Testnet."
      >
        <div className="flex w-full flex-col items-center gap-3">
          <Button
            type="button"
            variant="brand"
            size="lg"
            disabled={switchChain.isPending}
            aria-live="polite"
            onClick={() => {
              switchChain.reset();
              switchChain.switchChain({ chainId: defaultWalletChain.id });
            }}
          >
            {switchChain.isPending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Network className="size-4" aria-hidden="true" />
            )}
            {switchChain.isPending ? "Switching…" : "Switch network"}
          </Button>
          {networkError ? (
            <p role="alert" className="max-w-lg text-sm leading-6 text-red-300">
              <span className="font-semibold">{networkError.title}.</span>{" "}
              {networkError.description}
            </p>
          ) : null}
        </div>
      </DashboardStateCard>
    );
  }

  if (dashboardQuery.isPending) return <DashboardLoadingState />;

  if (
    dashboardQuery.error instanceof DashboardApiError &&
    dashboardQuery.error.status === 401
  ) {
    return (
      <DashboardStateCard
        icon={ShieldCheck}
        title="Verify wallet ownership"
        description="Sign a read-only message to view this wallet’s task history. This does not grant transaction or spending permission."
      >
        <Button type="button" variant="brand" size="lg" disabled={actionState.pending} aria-live="polite" onClick={verifyWallet}>
          {actionState.pending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <LockKeyhole className="size-4" aria-hidden="true" />
          )}
          {actionState.pending ? "Waiting for signature…" : "Verify and open dashboard"}
        </Button>
        {actionState.error ? (
          <p role="alert" className="w-full text-sm text-red-300">{actionState.error}</p>
        ) : null}
      </DashboardStateCard>
    );
  }

  if (!dashboardQuery.data) {
    return (
      <DashboardStateCard
        icon={CircleAlert}
        title="Dashboard data is temporarily unavailable"
        description="Task records could not be loaded. Try again."
      >
        <Button type="button" variant="outline" size="lg" onClick={() => dashboardQuery.refetch()}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      </DashboardStateCard>
    );
  }

  return (
    <DashboardView
      dashboard={dashboardQuery.data.dashboard}
      refreshFailed={dashboardQuery.isError}
      refreshing={dashboardQuery.isFetching}
      onRefresh={() => dashboardQuery.refetch()}
    />
  );
}

export function DashboardPageClient() {
  return (
    <ConnectButton.Custom>
      {({ mounted }) => <DashboardConnected mounted={mounted} />}
    </ConnectButton.Custom>
  );
}
