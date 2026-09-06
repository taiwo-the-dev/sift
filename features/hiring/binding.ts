import { getAddress, isAddress, type Address } from "viem";

import type {
  HiringAgentSummary,
  HiringMissionInput,
  HiringQuote,
} from "@/features/hiring/model";
import {
  erc8183Deployment,
  HIRING_CHAIN_ID,
} from "@/features/hiring/protocol";
import { maximumSpendToBaseUnits } from "@/features/hiring/validation";

export type ActivationBindingCheck = Readonly<{
  key: "amount" | "chain" | "contract" | "expiry" | "owner" | "token" | "wallet";
  label: string;
}>;

export class ActivationBindingError extends Error {
  constructor(readonly check: ActivationBindingCheck["key"], message: string) {
    super(message);
    this.name = "ActivationBindingError";
  }
}

export function quoteRequiresRefreshForWallet(
  quotedForWallet: string | null,
  connectedWallet: string | null,
): boolean {
  return Boolean(
    quotedForWallet &&
      connectedWallet &&
      quotedForWallet.toLowerCase() !== connectedWallet.toLowerCase(),
  );
}

/**
 * Reassert the complete quote-to-activation binding before an intent is saved.
 * Cryptographic signature and live deployment validation happen on the server;
 * this guard prevents stale or mismatched client state reaching that boundary.
 */
export function assertActivationBinding(input: Readonly<{
  agent: Pick<HiringAgentSummary, "chainId" | "ownerAddress">;
  mission: HiringMissionInput;
  now?: number;
  quote: HiringQuote;
  walletAddress: Address | string;
}>): readonly ActivationBindingCheck[] {
  if (
    input.agent.chainId !== HIRING_CHAIN_ID ||
    input.quote.chainId !== HIRING_CHAIN_ID ||
    erc8183Deployment.chainId !== HIRING_CHAIN_ID
  ) {
    throw new ActivationBindingError(
      "chain",
      "The price quote, agent, and hiring contract must all use BSC Testnet (chain 97).",
    );
  }

  if (
    getAddress(input.agent.ownerAddress) !==
    getAddress(input.quote.providerAddress)
  ) {
    throw new ActivationBindingError(
      "owner",
      "The signed price quote no longer matches the agent owner's wallet.",
    );
  }

  const verifyingContract = input.quote.signedEnvelope.verifying_contract;

  if (
    typeof verifyingContract !== "string" ||
    !isAddress(verifyingContract) ||
    getAddress(verifyingContract) !== erc8183Deployment.commerce
  ) {
    throw new ActivationBindingError(
      "contract",
      "The signed quote is not bound to Sift's verified Agentic Commerce contract.",
    );
  }

  if (
    getAddress(input.quote.tokenAddress) !== erc8183Deployment.paymentToken ||
    input.quote.tokenDecimals !== erc8183Deployment.tokenDecimals ||
    input.quote.tokenSymbol !== erc8183Deployment.tokenSymbol
  ) {
    throw new ActivationBindingError(
      "token",
      "The signed quote does not use Sift's verified testnet payment token.",
    );
  }

  const maximumSpend = maximumSpendToBaseUnits(input.mission.maxSpend);
  const quotedMaximum = BigInt(input.quote.maximumSpendBaseUnits);
  const budget = BigInt(input.quote.budgetBaseUnits);

  if (
    quotedMaximum !== maximumSpend ||
    budget > maximumSpend ||
    budget < 0n
  ) {
    throw new ActivationBindingError(
      "amount",
      "The quote amount is not bound to the reviewed maximum spend.",
    );
  }

  const now = input.now ?? Date.now();

  if (new Date(input.quote.quoteExpiresAt).getTime() <= now + 30_000) {
    throw new ActivationBindingError(
      "expiry",
      "The signed price quote expired or leaves too little time to hire safely.",
    );
  }

  if (!isAddress(input.walletAddress)) {
    throw new ActivationBindingError(
      "wallet",
      "Connect a valid wallet before saving the hiring request.",
    );
  }

  return [
    { key: "chain", label: "BSC Testnet · chain 97" },
    { key: "owner", label: "Price quote matches the agent owner" },
    { key: "contract", label: "Verified Agentic Commerce deployment" },
    { key: "token", label: "Verified U test token" },
    { key: "amount", label: "Finite budget at or below the reviewed maximum" },
    { key: "expiry", label: "Price quote is current and has an expiry time" },
    { key: "wallet", label: "Connected hiring wallet" },
  ];
}
