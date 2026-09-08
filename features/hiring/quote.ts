import {
  getAddress,
  hashMessage,
  isAddress,
  keccak256,
  recoverMessageAddress,
  toBytes,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
} from "viem";
import { z } from "zod";

import type { HiringMissionInput, HiringQuote } from "@/features/hiring/model";
import {
  getErc8183Deployment,
  type Erc8183Deployment,
  type HiringChainId,
} from "@/features/hiring/protocol";
import {
  calculateExpiry,
  formatTokenAmount,
  maximumSpendToBaseUnits,
  parseCanonicalUint256,
} from "@/features/hiring/validation";

const MAXIMUM_DESCRIPTION_BYTES = 4_096;
const signaturePattern = /^0x(?:[0-9a-fA-F]{2})+$/;
const hashPattern = /^0x[0-9a-fA-F]{64}$/;
const erc1271MagicValue = "0x1626ba7e";

const erc1271Abi = [
  {
    type: "function",
    name: "isValidSignature",
    stateMutability: "view",
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "signature", type: "bytes" },
    ],
    outputs: [{ type: "bytes4" }],
  },
] as const;

const agentStatusSchema = z
  .object({
    agent_address: z.string(),
    chain_id: z.number().int().optional(),
    commerce_address: z.string(),
    currency: z.string(),
    decimals: z.number().int().min(0).max(255).optional(),
    policy_address: z.string(),
    router_address: z.string(),
    service_price: z.string(),
    status: z.literal("ok"),
  })
  .loose();

const negotiationEnvelopeSchema = z
  .object({
    chain_id: z.number().int(),
    negotiation_hash: z.string().regex(hashPattern),
    provider_sig: z.string().regex(signaturePattern),
    request: z
      .object({
        task_description: z.string(),
        terms: z
          .object({
            deliverables: z.string(),
            quality_standards: z.string(),
          })
          .loose(),
      })
      .loose(),
    response: z
      .object({
        accepted: z.boolean(),
        estimated_completion_seconds: z.number().int().nonnegative().optional(),
        negotiated_at: z.number().int().positive(),
        quote_expires_at: z.number().int().positive(),
        reason: z.string().optional(),
        terms: z
          .object({
            currency: z.string(),
            deliverables: z.string(),
            price: z.string(),
            quality_standards: z.string(),
            success_criteria: z.array(z.string()).max(20).optional(),
          })
          .loose(),
      })
      .loose(),
    verifying_contract: z.string(),
  })
  .loose();

export type AgentCommerceStatus = Readonly<{
  agentAddress: Address;
  servicePrice: bigint;
}>;

export type ParsedNegotiationEnvelope = z.infer<
  typeof negotiationEnvelopeSchema
>;

export class HiringQuoteError extends Error {
  constructor(
    readonly code:
      | "agent-unavailable"
      | "invalid-agent-status"
      | "invalid-quote"
      | "quote-declined"
      | "quote-expired"
      | "quote-over-budget"
      | "quote-signature-invalid"
      | "protocol-unavailable"
      | "unsupported-agent-service",
    message: string,
  ) {
    super(message);
    this.name = "HiringQuoteError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function usesLegacyAgentStatusFormat(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (typeof value.payment_token === "string" &&
      typeof value.currency !== "string") ||
    typeof value.service_price === "number"
  );
}

function isUnsignedLegacyQuote(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.accepted === "boolean" &&
    typeof value.price === "string" &&
    typeof value.currency === "string" &&
    typeof value.provider_sig !== "string"
  );
}

function sanitizeForClaim(value: string): string {
  return value
    .replaceAll("[", "(")
    .replaceAll("]", ")")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
}

function sortCanonicalValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortCanonicalValue);
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};

    for (const key of Object.keys(value).sort()) {
      result[key] = sortCanonicalValue(
        (value as Record<string, unknown>)[key],
      );
    }

    return result;
  }

  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new TypeError("Canonical JSON cannot contain non-finite numbers.");
  }

  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortCanonicalValue(value)).replace(
    /[\u007f-\uffff]/g,
    (character) =>
      `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

function buildDescriptionContent(
  envelope: ParsedNegotiationEnvelope,
): Record<string, unknown> {
  const successCriteria = envelope.response.terms.success_criteria;
  const terms: Record<string, unknown> = {
    deliverables: sanitizeForClaim(envelope.response.terms.deliverables),
    quality_standards: sanitizeForClaim(
      envelope.response.terms.quality_standards,
    ),
  };

  if (successCriteria?.length) {
    terms.success_criteria = successCriteria.map(sanitizeForClaim);
  }

  return {
    chain_id: envelope.chain_id,
    currency: envelope.response.terms.currency,
    negotiated_at: envelope.response.negotiated_at,
    price: envelope.response.terms.price,
    quote_expires_at: envelope.response.quote_expires_at,
    task: sanitizeForClaim(envelope.request.task_description),
    terms,
    verifying_contract: getAddress(envelope.verifying_contract),
    version: 1,
  };
}

export function buildSignedJobDescription(
  envelope: ParsedNegotiationEnvelope,
): string {
  const description = canonicalJson({
    ...buildDescriptionContent(envelope),
    negotiation_hash: envelope.negotiation_hash,
    provider_sig: envelope.provider_sig,
  });

  if (new TextEncoder().encode(description).byteLength > MAXIMUM_DESCRIPTION_BYTES) {
    throw new HiringQuoteError(
      "invalid-quote",
      "The signed price quote is too large to save in the blockchain transaction.",
    );
  }

  return description;
}

export function parseAgentCommerceStatus(
  input: unknown,
  indexedOwner: Address,
  chainId: HiringChainId,
): AgentCommerceStatus {
  const deployment = getErc8183Deployment(chainId);
  const result = agentStatusSchema.safeParse(input);

  if (!result.success) {
    if (usesLegacyAgentStatusFormat(input)) {
      throw new HiringQuoteError(
        "unsupported-agent-service",
        "This agent uses an older ERC-8183 hiring format. Its owner must update the service before protected hiring can continue.",
      );
    }

    throw new HiringQuoteError(
      "invalid-agent-status",
      "The agent did not return a valid ERC-8183 status document.",
    );
  }

  const status = result.data;
  const addressFields = [
    status.agent_address,
    status.commerce_address,
    status.currency,
    status.policy_address,
    status.router_address,
  ];

  if (!addressFields.every((address) => isAddress(address))) {
    throw new HiringQuoteError(
      "invalid-agent-status",
      "The agent status contains an invalid contract or provider address.",
    );
  }

  if (
    getAddress(status.agent_address) !== getAddress(indexedOwner) ||
    getAddress(status.commerce_address) !== deployment.commerce ||
    getAddress(status.router_address) !== deployment.router ||
    getAddress(status.policy_address) !== deployment.policy ||
    getAddress(status.currency) !== deployment.paymentToken ||
    (status.decimals !== undefined &&
      status.decimals !== deployment.tokenDecimals) ||
    (status.chain_id !== undefined && status.chain_id !== deployment.chainId)
  ) {
    throw new HiringQuoteError(
      "invalid-agent-status",
      `The live agent status does not match its registered owner or Sift's verified ${deployment.networkName} contracts.`,
    );
  }

  return {
    agentAddress: getAddress(status.agent_address),
    servicePrice: parseCanonicalUint256(status.service_price, "Service price"),
  };
}

export function parseNegotiationEnvelope(
  input: unknown,
): ParsedNegotiationEnvelope {
  const result = negotiationEnvelopeSchema.safeParse(input);

  if (!result.success) {
    if (isUnsignedLegacyQuote(input)) {
      throw new HiringQuoteError(
        "unsupported-agent-service",
        "This agent returned an unsigned price. Its owner must update the service before protected hiring can continue.",
      );
    }

    throw new HiringQuoteError(
      "invalid-quote",
      "The agent returned an invalid signed quote.",
    );
  }

  if (!result.data.response.accepted) {
    throw new HiringQuoteError(
      "quote-declined",
      result.data.response.reason?.slice(0, 200) ||
        "The agent declined this task.",
    );
  }

  return result.data;
}

async function verifyEnvelopeSignature(
  envelope: ParsedNegotiationEnvelope,
  provider: Address,
  publicClient: PublicClient,
  deployment: Erc8183Deployment,
): Promise<"eip191" | "erc1271"> {
  const canonical = canonicalJson(buildDescriptionContent(envelope));
  const recomputed = keccak256(toBytes(canonical));

  if (recomputed.toLowerCase() !== envelope.negotiation_hash.toLowerCase()) {
    throw new HiringQuoteError(
      "quote-signature-invalid",
      "The signed quote content does not match its negotiation hash.",
    );
  }

  try {
    const recovered = await recoverMessageAddress({
      message: envelope.negotiation_hash,
      signature: envelope.provider_sig as Hex,
    });

    if (recovered === provider) {
      return "eip191";
    }
  } catch {
    // Contract wallets use ERC-1271 and do not need a 65-byte EOA signature.
  }

  const bytecode = await publicClient.getBytecode({ address: provider });

  if (bytecode && bytecode !== "0x") {
    const result = await publicClient.readContract({
      address: provider,
      abi: erc1271Abi,
      functionName: "isValidSignature",
      args: [hashMessage(envelope.negotiation_hash), envelope.provider_sig as Hex],
      account: deployment.commerce,
    });

    if (String(result).toLowerCase() === erc1271MagicValue) {
      return "erc1271";
    }
  }

  throw new HiringQuoteError(
    "quote-signature-invalid",
    "The provider signature does not match the agent owner's wallet.",
  );
}

export async function validateHiringQuote(
  input: Readonly<{
    chainId: HiringChainId;
    envelope: unknown;
    disputeWindowSeconds: number;
    mission: HiringMissionInput;
    now?: number;
    platformFeeBasisPoints: number;
    provider: Address;
    publicClient: PublicClient;
  }>,
): Promise<HiringQuote> {
  const deployment = getErc8183Deployment(input.chainId);
  const envelope = parseNegotiationEnvelope(input.envelope);
  const now = input.now ?? Date.now();
  const nowSeconds = Math.floor(now / 1_000);
  const maximumSpend = maximumSpendToBaseUnits(
    input.mission.maxSpend,
    input.chainId,
  );
  const price = parseCanonicalUint256(
    envelope.response.terms.price,
    "Quoted price",
  );

  if (
    envelope.chain_id !== deployment.chainId ||
    !isAddress(envelope.verifying_contract) ||
    getAddress(envelope.verifying_contract) !== deployment.commerce ||
    !isAddress(envelope.response.terms.currency) ||
    getAddress(envelope.response.terms.currency) !== deployment.paymentToken
  ) {
    throw new HiringQuoteError(
      "invalid-quote",
      "The signed quote targets an unsupported chain, contract, or payment token.",
    );
  }

  if (
    envelope.request.task_description !== input.mission.mission ||
    envelope.request.terms.deliverables !== input.mission.deliverables ||
    envelope.request.terms.quality_standards !== input.mission.qualityStandards ||
    envelope.response.terms.deliverables !== input.mission.deliverables ||
    envelope.response.terms.quality_standards !== input.mission.qualityStandards
  ) {
    throw new HiringQuoteError(
      "invalid-quote",
      "The quote does not preserve the task requirements submitted to the agent.",
    );
  }

  if (envelope.response.quote_expires_at <= nowSeconds + 30) {
    throw new HiringQuoteError(
      "quote-expired",
      "The signed quote has expired or leaves too little time to fund safely.",
    );
  }

  if (
    envelope.response.negotiated_at > nowSeconds + 60 ||
    envelope.response.quote_expires_at - envelope.response.negotiated_at > 900
  ) {
    throw new HiringQuoteError(
      "invalid-quote",
      "The quote timestamps are outside the current BNB Agent SDK limits.",
    );
  }

  if (price > maximumSpend) {
    throw new HiringQuoteError(
      "quote-over-budget",
      `The agent quoted ${formatTokenAmount(price, deployment.tokenDecimals)} ${deployment.tokenSymbol}, above your maximum spend.`,
    );
  }

  const signatureMethod = await verifyEnvelopeSignature(
    envelope,
    input.provider,
    input.publicClient,
    deployment,
  );
  const expiresAt = calculateExpiry(input.mission.durationSeconds, now);
  const expiresAtSeconds = Math.floor(expiresAt.getTime() / 1_000);
  const estimatedCompletion =
    envelope.response.estimated_completion_seconds ?? 0;

  if (
    !Number.isInteger(input.disputeWindowSeconds) ||
    input.disputeWindowSeconds <= 0 ||
    expiresAtSeconds <=
      nowSeconds + estimatedCompletion + input.disputeWindowSeconds + 300
  ) {
    throw new HiringQuoteError(
      "invalid-quote",
      "The selected expiry does not leave enough time for delivery, evaluation, and a safety margin.",
    );
  }

  return {
    budgetBaseUnits: price.toString(),
    budgetDisplay: formatTokenAmount(price, deployment.tokenDecimals),
    chainId: deployment.chainId,
    disputeWindowSeconds: input.disputeWindowSeconds,
    estimatedCompletionSeconds:
      envelope.response.estimated_completion_seconds ?? null,
    expiresAt: expiresAt.toISOString(),
    maximumSpendBaseUnits: maximumSpend.toString(),
    maximumSpendDisplay: formatTokenAmount(
      maximumSpend,
      deployment.tokenDecimals,
    ),
    negotiationHash: envelope.negotiation_hash as Hash,
    onchainDescription: buildSignedJobDescription(envelope),
    platformFeeBasisPoints: input.platformFeeBasisPoints,
    providerAddress: input.provider,
    quoteExpiresAt: new Date(
      envelope.response.quote_expires_at * 1_000,
    ).toISOString(),
    signedEnvelope: envelope,
    signatureMethod,
    tokenAddress: deployment.paymentToken,
    tokenDecimals: deployment.tokenDecimals,
    tokenSymbol: deployment.tokenSymbol,
  };
}
