import type {
  CreateHiringIntentInput,
  HiringIntentSnapshot,
  HiringMissionInput,
  HiringQuote,
} from "@/features/hiring/model";
import type { HiringTransactionStep } from "@/features/hiring/protocol";
import type { Hash } from "viem";

export class HiringApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "HiringApiError";
  }
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | Readonly<{ error?: unknown }>
    | null;

  if (!response.ok) {
    throw new HiringApiError(
      typeof payload?.error === "string"
        ? payload.error
        : "Sift could not complete the hiring request.",
      response.status,
    );
  }

  return payload as T;
}

export async function requestHiringQuote(
  agent: Readonly<{ agentId: string; chainId: number }>,
  mission: HiringMissionInput,
): Promise<HiringQuote> {
  const response = await fetch("/api/hiring/negotiate", {
    body: JSON.stringify({ ...agent, ...mission }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload = await readApiResponse<Readonly<{ quote: HiringQuote }>>(
    response,
  );
  return payload.quote;
}

export async function createRemoteHiringIntent(
  input: CreateHiringIntentInput,
): Promise<HiringIntentSnapshot> {
  const response = await fetch("/api/hiring/jobs", {
    body: JSON.stringify({
      agentId: input.agentId,
      chainId: input.chainId,
      deliverables: input.deliverables,
      durationSeconds: input.durationSeconds,
      idempotencyKey: input.idempotencyKey,
      mainnetRiskAccepted: input.mainnetRiskAccepted,
      maxSpend: input.maxSpend,
      mission: input.mission,
      qualityStandards: input.qualityStandards,
      resumeToken: input.resumeToken,
      signedEnvelope: input.quote.signedEnvelope,
      walletAddress: input.walletAddress,
    }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload = await readApiResponse<
    Readonly<{ intent: HiringIntentSnapshot }>
  >(response);
  return payload.intent;
}

export async function loadRemoteHiringIntent(
  id: string,
  resumeToken: string,
): Promise<HiringIntentSnapshot> {
  const response = await fetch(`/api/hiring/jobs/${encodeURIComponent(id)}`, {
    headers: { "x-sift-resume-token": resumeToken },
  });
  const payload = await readApiResponse<
    Readonly<{ intent: HiringIntentSnapshot }>
  >(response);
  return payload.intent;
}

export async function recordRemoteHiringTransaction(
  id: string,
  resumeToken: string,
  input: Readonly<{
    hash: Hash;
    replacedHash?: Hash | null;
    step: HiringTransactionStep;
  }>,
): Promise<HiringIntentSnapshot> {
  const response = await fetch(`/api/hiring/jobs/${encodeURIComponent(id)}`, {
    body: JSON.stringify({ action: "record_transaction", ...input }),
    headers: {
      "content-type": "application/json",
      "x-sift-resume-token": resumeToken,
    },
    method: "PATCH",
  });
  const payload = await readApiResponse<
    Readonly<{ intent: HiringIntentSnapshot }>
  >(response);
  return payload.intent;
}

export async function recordRemoteClientState(
  id: string,
  resumeToken: string,
  status: "awaiting_wallet" | "cancelled",
  message?: string,
): Promise<HiringIntentSnapshot> {
  const response = await fetch(`/api/hiring/jobs/${encodeURIComponent(id)}`, {
    body: JSON.stringify({ action: "client_state", message, status }),
    headers: {
      "content-type": "application/json",
      "x-sift-resume-token": resumeToken,
    },
    method: "PATCH",
  });
  const payload = await readApiResponse<
    Readonly<{ intent: HiringIntentSnapshot }>
  >(response);
  return payload.intent;
}
