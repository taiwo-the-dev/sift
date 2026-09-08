import { getAddress, type Hash } from "viem";
import { z } from "zod";

import type { HiringIntentStatus } from "@/features/hiring/model";
import { inspectAltanaHiringTransaction } from "@/features/altana/receipt";
import {
  getErc8183Deployment,
  hiringTransactionSteps,
  isHiringChainId,
  paymentTokenAbi,
  type HiringChainId,
  type HiringTransactionStep,
} from "@/features/hiring/protocol";
import {
  HiringTransactionVerificationError,
  inspectHiringTransaction,
} from "@/features/hiring/receipt";
import { canTransitionHiringIntent } from "@/features/hiring/state";
import { getHiringPublicClient } from "@/lib/blockchain/hiring-client";
import {
  getAuthorizedHiringIntent,
  HiringAuthorizationError,
  HiringConflictError,
  persistVerifiedHiringTransaction,
  updateHiringIntent,
} from "@/lib/db/hiring-repository";

export const runtime = "nodejs";

const routeIdPattern = /^[0-9a-f-]{36}$/i;
const hashPattern = /^0x[0-9a-fA-F]{64}$/;
const transactionActionSchema = z.object({
  action: z.literal("record_transaction"),
  hash: z.string().regex(hashPattern),
  replacedHash: z.string().regex(hashPattern).nullable().optional(),
  step: z.enum(hiringTransactionSteps),
});
const clientStateActionSchema = z.object({
  action: z.literal("client_state"),
  message: z.string().max(300).optional(),
  status: z.enum(["awaiting_wallet", "cancelled"]),
});
const altanaHireActionSchema = z.object({
  action: z.literal("record_altana_hire"),
  hash: z.string().regex(hashPattern),
  sessionExpiry: z.number().int().positive(),
  sessionPublicKey: z.string().regex(/^0x04[0-9a-fA-F]{128}$/),
});
const actionSchema = z.discriminatedUnion("action", [
  transactionActionSchema,
  clientStateActionSchema,
  altanaHireActionSchema,
]);

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function resumeToken(request: Request): string | null {
  const token = request.headers.get("x-sift-resume-token")?.trim();
  return token || null;
}

async function routeId(
  context: Readonly<{ params: Promise<{ id: string }> }>,
): Promise<string | null> {
  const { id } = await context.params;
  return routeIdPattern.test(id) ? id : null;
}

function priorStepsConfirmed(
  step: HiringTransactionStep,
  confirmedSteps: readonly HiringTransactionStep[],
): boolean {
  const required: Readonly<Record<HiringTransactionStep, readonly HiringTransactionStep[]>> = {
    approve_token: ["create_job", "register_job", "set_budget"],
    create_job: [],
    fund_job: ["create_job", "register_job", "set_budget"],
    register_job: ["create_job"],
    set_budget: ["create_job", "register_job"],
  };

  return required[step].every((candidate) => confirmedSteps.includes(candidate));
}

function nextStepAfter(
  step: HiringTransactionStep,
  approvalRequired: boolean,
): HiringTransactionStep | null {
  if (step === "create_job") return "register_job";
  if (step === "register_job") return "set_budget";
  if (step === "set_budget") return approvalRequired ? "approve_token" : "fund_job";
  if (step === "approve_token") return "fund_job";
  return null;
}

async function allowanceRequiresApproval(
  walletAddress: string,
  budget: bigint,
  chainId: HiringChainId,
): Promise<boolean> {
  if (budget === 0n) {
    return false;
  }

  const deployment = getErc8183Deployment(chainId);
  const allowance = await getHiringPublicClient(chainId).readContract({
    address: deployment.paymentToken,
    abi: paymentTokenAbi,
    functionName: "allowance",
    args: [getAddress(walletAddress), deployment.commerce],
  });
  return allowance < budget;
}

export async function GET(
  request: Request,
  context: Readonly<{ params: Promise<{ id: string }> }>,
): Promise<Response> {
  const id = await routeId(context);
  const token = resumeToken(request);

  if (!id || !token) {
    return json({ error: "Saved hiring process not found." }, 404);
  }

  try {
    const result = await getAuthorizedHiringIntent(id, token);
    return json({ intent: result.snapshot });
  } catch (error) {
    if (error instanceof HiringAuthorizationError) {
      return json({ error: error.message }, 404);
    }

    console.error("[hiring] intent load failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ error: "Sift could not load the saved hiring process." }, 500);
  }
}

export async function PATCH(
  request: Request,
  context: Readonly<{ params: Promise<{ id: string }> }>,
): Promise<Response> {
  const id = await routeId(context);
  const token = resumeToken(request);
  const contentLength = Number(request.headers.get("content-length") ?? "0");

  if (
    !id ||
    !token ||
    contentLength > 4_096 ||
    !request.headers.get("content-type")?.startsWith("application/json") ||
    request.headers.get("sec-fetch-site") === "cross-site" ||
    (request.headers.get("origin") &&
      request.headers.get("origin") !== new URL(request.url).origin)
  ) {
    return json({ error: "Invalid saved hiring request." }, 400);
  }

  try {
    const action = actionSchema.parse(await request.json());
    const authorized = await getAuthorizedHiringIntent(id, token);
    let job = authorized.record;

    if (!isHiringChainId(job.chain_id)) {
      throw new HiringConflictError(
        "The saved hiring request uses an unsupported network.",
      );
    }

    const deployment = getErc8183Deployment(job.chain_id);

    if (action.action === "client_state") {
      const nextStatus = action.status as HiringIntentStatus;

      if (!canTransitionHiringIntent(authorized.snapshot.status, nextStatus)) {
        throw new HiringConflictError(
          "The saved hiring process cannot move to that step.",
        );
      }

      job = await updateHiringIntent(
        id,
        {
          failure_code: nextStatus === "cancelled" ? "wallet-rejected" : null,
          failure_message:
            nextStatus === "cancelled"
              ? action.message?.trim().slice(0, 300) ||
                "The wallet request was cancelled before confirmation."
              : null,
          status: nextStatus,
        },
        {
          details: { status: nextStatus },
          type:
            nextStatus === "cancelled" ? "wallet_cancelled" : "wallet_awaiting",
        },
      );
      const refreshed = await getAuthorizedHiringIntent(job.id, token);
      return json({ intent: refreshed.snapshot });
    }

    if (action.action === "record_altana_hire") {
      const existing = authorized.snapshot.transactions.find(
        (transaction) => transaction.step === "fund_job",
      );
      if (
        authorized.snapshot.status === "confirmed" &&
        existing?.hash.toLowerCase() === action.hash.toLowerCase()
      ) {
        return json({ intent: authorized.snapshot });
      }
      if (authorized.snapshot.status === "confirmed") {
        throw new HiringConflictError("This hiring process is already confirmed.");
      }
      if (
        authorized.snapshot.transactions.length > 0 ||
        authorized.snapshot.currentStep !== "create_job"
      ) {
        throw new HiringConflictError(
          "A direct-wallet transaction already started. Restart with a fresh quote to use protected hiring.",
        );
      }

      const verification = await inspectAltanaHiringTransaction({
        client: getHiringPublicClient(job.chain_id),
        hash: action.hash as Hash,
        job,
        sessionExpiry: action.sessionExpiry,
        sessionPublicKey: action.sessionPublicKey as `0x${string}`,
      });
      const snapshot = await persistVerifiedHiringTransaction(job, verification, {
        block_number: Number(verification.blockNumber),
        confirmed_at: verification.confirmedAt,
        current_step: null,
        failure_code: null,
        failure_message: null,
        onchain_job_id: verification.onchainJobId,
        status: "confirmed",
        transaction_hash: verification.hash.toLowerCase(),
      });
      return json({ intent: snapshot });
    }

    if (authorized.snapshot.status === "confirmed") {
      const existing = authorized.snapshot.transactions.find(
        (transaction) => transaction.step === action.step,
      );

      if (existing?.hash.toLowerCase() === action.hash.toLowerCase()) {
        return json({ intent: authorized.snapshot });
      }

      throw new HiringConflictError("This hiring process is already confirmed.");
    }

    const confirmedSteps = authorized.snapshot.transactions
      .filter((transaction) => transaction.status === "confirmed")
      .map((transaction) => transaction.step);
    const existing = authorized.snapshot.transactions.find(
      (transaction) => transaction.step === action.step,
    );

    if (
      existing &&
      existing.hash.toLowerCase() === action.hash.toLowerCase() &&
      (existing.status === "confirmed" || existing.status === "failed" || existing.status === "cancelled")
    ) {
      return json({ intent: authorized.snapshot });
    }

    if (!existing && job.current_step !== action.step) {
      throw new HiringConflictError(
        "This transaction does not match the current hiring step.",
      );
    }

    if (!priorStepsConfirmed(action.step, confirmedSteps)) {
      throw new HiringConflictError(
        "A required earlier hiring transaction is not confirmed yet.",
      );
    }

    if (
      existing &&
      existing.hash.toLowerCase() !== action.hash.toLowerCase() &&
      existing.hash.toLowerCase() !== action.replacedHash?.toLowerCase() &&
      existing.status !== "failed" &&
      existing.status !== "cancelled"
    ) {
      throw new HiringConflictError(
        "A different transaction is already recorded for this hiring step.",
      );
    }

    if (action.step === "approve_token" && BigInt(job.budget_base_units) === 0n) {
      throw new HiringConflictError("A zero-price job does not require approval.");
    }

    if (action.step === "fund_job") {
      const approvalConfirmed = confirmedSteps.includes("approve_token");
      const approvalRequired = await allowanceRequiresApproval(
        job.wallet_address,
        BigInt(job.budget_base_units),
        job.chain_id,
      );

      if (approvalRequired && !approvalConfirmed) {
        throw new HiringConflictError(
          "The exact token approval must confirm before funding.",
        );
      }
    }

    const verification = await inspectHiringTransaction({
      client: getHiringPublicClient(job.chain_id),
      hash: action.hash as Hash,
      job,
      replacedHash: action.replacedHash as Hash | null | undefined,
      step: action.step,
    });
    const budget = BigInt(job.budget_base_units);
    let jobUpdate: Parameters<typeof persistVerifiedHiringTransaction>[2];

    if (verification.status === "confirmed") {
      const approvalRequired =
        action.step === "set_budget"
          ? await allowanceRequiresApproval(
              job.wallet_address,
              budget,
              job.chain_id,
            )
          : false;
      const nextStep = nextStepAfter(action.step, approvalRequired);
      const isComplete = action.step === "fund_job";
      jobUpdate = {
        block_number: isComplete ? Number(verification.blockNumber) : null,
        confirmed_at: isComplete ? verification.confirmedAt : null,
        current_step: nextStep,
        failure_code: null,
        failure_message: null,
        onchain_job_id: verification.onchainJobId ?? job.onchain_job_id,
        status: isComplete ? "confirmed" : "submitted",
        transaction_hash: isComplete ? verification.hash.toLowerCase() : null,
      };
    } else if (verification.status === "failed") {
      jobUpdate = {
        failure_code: "transaction-reverted",
        failure_message:
          `The ${deployment.networkName} transaction reverted. No confirmation was recorded.`,
        status: "failed",
      };
    } else {
      jobUpdate = {
        current_step: action.step,
        status: verification.status === "replaced" ? "replaced" : "submitted",
      };
    }

    const snapshot = await persistVerifiedHiringTransaction(
      job,
      verification,
      jobUpdate,
    );
    return json({ intent: snapshot });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Invalid hiring status update." }, 400);
    }

    if (error instanceof HiringAuthorizationError) {
      return json({ error: error.message }, 404);
    }

    if (error instanceof HiringConflictError) {
      return json({ error: error.message }, 409);
    }

    if (error instanceof HiringTransactionVerificationError) {
      return json({ code: error.code, error: error.message }, 409);
    }

    console.error("[hiring] transaction verification failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return json(
      { error: "Sift could not verify this transaction against its saved BNB network." },
      500,
    );
  }
}
