import { cookies } from "next/headers";
import { getAddress, isAddress } from "viem";

import { DASHBOARD_SESSION_COOKIE } from "@/features/dashboard/session";
import { getWalletDashboard } from "@/features/dashboard/service";
import { getDashboardSession } from "@/lib/db/dashboard-session-repository";

export const runtime = "nodejs";

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const requestedWallet = request.headers.get("x-sift-wallet-address");
    if (!requestedWallet || !isAddress(requestedWallet)) {
      return json({ error: "A connected wallet is required." }, 401);
    }
    const sessionToken = (await cookies()).get(DASHBOARD_SESSION_COOKIE)?.value;
    const session = await getDashboardSession(sessionToken ?? null);
    if (!session || session.walletAddress !== getAddress(requestedWallet)) {
      return json({ error: "Verify the connected wallet to view its dashboard." }, 401);
    }

    const dashboard = await getWalletDashboard(session.walletAddress);
    return json({ dashboard, session });
  } catch (error) {
    console.error("[dashboard] load failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return json(
      { error: "Sift could not load persisted jobs. No data was substituted." },
      500,
    );
  }
}
