import type { DashboardSnapshot } from "@/features/dashboard/model";
import type {
  DashboardChallenge,
  DashboardSessionIdentity,
} from "@/features/dashboard/session";
import type { HiringChainId } from "@/features/hiring/protocol";

export class DashboardApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "DashboardApiError";
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | Readonly<{ error?: unknown }>
    | null;
  if (!response.ok) {
    throw new DashboardApiError(
      typeof payload?.error === "string"
        ? payload.error
        : "Sift could not load the dashboard.",
      response.status,
    );
  }
  return payload as T;
}

export async function requestDashboardChallenge(
  address: string,
  chainId: HiringChainId,
): Promise<DashboardChallenge> {
  const response = await fetch(
    `/api/dashboard/session?address=${encodeURIComponent(address)}&chainId=${chainId}`,
    { cache: "no-store" },
  );
  return (
    await readResponse<Readonly<{ challenge: DashboardChallenge }>>(response)
  ).challenge;
}

export async function authorizeDashboard(
  signature: string,
): Promise<DashboardSessionIdentity> {
  const response = await fetch("/api/dashboard/session", {
    body: JSON.stringify({ signature }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  return (
    await readResponse<Readonly<{ session: DashboardSessionIdentity }>>(response)
  ).session;
}

export async function loadDashboard(
  walletAddress: string,
  chainId: HiringChainId,
): Promise<Readonly<{
  dashboard: DashboardSnapshot;
  session: DashboardSessionIdentity;
}>> {
  const response = await fetch("/api/dashboard", {
    cache: "no-store",
    headers: {
      "x-sift-chain-id": String(chainId),
      "x-sift-wallet-address": walletAddress,
    },
  });
  return readResponse(response);
}

export async function clearDashboardSession(): Promise<void> {
  const response = await fetch("/api/dashboard/session", { method: "DELETE" });
  await readResponse<Readonly<{ cleared: true }>>(response);
}
