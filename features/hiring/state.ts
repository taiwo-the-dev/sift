import type {
  HiringIntentSnapshot,
  HiringIntentStatus,
  HiringTransactionStatus,
} from "@/features/hiring/model";
import type { HiringTransactionStep } from "@/features/hiring/protocol";

const intentTransitions: Readonly<
  Record<HiringIntentStatus, readonly HiringIntentStatus[]>
> = {
  awaiting_wallet: ["submitted", "cancelled", "failed"],
  cancelled: ["awaiting_wallet", "failed"],
  confirmed: [],
  draft: ["awaiting_wallet", "cancelled", "failed"],
  failed: ["awaiting_wallet"],
  replaced: ["submitted", "confirmed", "failed", "cancelled"],
  submitted: ["submitted", "replaced", "confirmed", "failed", "cancelled"],
};

const transactionTransitions: Readonly<
  Record<HiringTransactionStatus, readonly HiringTransactionStatus[]>
> = {
  cancelled: [],
  confirmed: [],
  failed: [],
  replaced: ["submitted", "confirmed", "failed", "cancelled"],
  submitted: ["submitted", "confirmed", "replaced", "failed", "cancelled"],
};

export function canTransitionHiringIntent(
  from: HiringIntentStatus,
  to: HiringIntentStatus,
): boolean {
  return from === to || intentTransitions[from].includes(to);
}

export function canTransitionHiringTransaction(
  from: HiringTransactionStatus,
  to: HiringTransactionStatus,
): boolean {
  return from === to || transactionTransitions[from].includes(to);
}

export function nextTransactionStep(
  completed: readonly HiringTransactionStep[],
  approvalRequired: boolean,
): HiringTransactionStep | null {
  const steps: readonly HiringTransactionStep[] = approvalRequired
    ? ["create_job", "register_job", "set_budget", "approve_token", "fund_job"]
    : ["create_job", "register_job", "set_budget", "fund_job"];

  return steps.find((step) => !completed.includes(step)) ?? null;
}

export function describeTransactionStep(step: HiringTransactionStep): string {
  const descriptions: Readonly<Record<HiringTransactionStep, string>> = {
    approve_token: "Approve exact U token spend",
    create_job: "Create the on-chain job",
    fund_job: "Fund and activate escrow",
    register_job: "Register the evaluation policy",
    set_budget: "Set the signed quote budget",
  };

  return descriptions[step];
}

export function describeTransactionEffect(step: HiringTransactionStep): string {
  const effects: Readonly<Record<HiringTransactionStep, string>> = {
    approve_token:
      "Allows only the signed U amount to be spent by the verified commerce contract.",
    create_job:
      "Creates a public on-chain job naming the provider, evaluator, expiry, and signed terms.",
    fund_job:
      "Moves the signed U amount into the job escrow. Funding does not prove delivery.",
    register_job:
      "Attaches Sift's verified evaluation policy to this public job.",
    set_budget:
      "Records the signed U budget on the public job before funding.",
  };

  return effects[step];
}

export function canRestartHiringIntent(
  intent: Pick<
    HiringIntentSnapshot,
    "currentStep" | "onchainJobId" | "status" | "transactions"
  >,
): boolean {
  return (
    (intent.status === "draft" ||
      intent.status === "awaiting_wallet" ||
      intent.status === "cancelled") &&
    intent.currentStep === "create_job" &&
    intent.onchainJobId === null &&
    intent.transactions.length === 0
  );
}
