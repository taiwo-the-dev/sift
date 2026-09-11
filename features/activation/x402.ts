import { x402Client } from "@x402/core/client";
import { encodePaymentSignatureHeader } from "@x402/core/http";
import {
  validatePaymentPayload,
  validatePaymentRequired,
} from "@x402/core/schemas";
import type {
  PaymentPayload as CorePaymentPayload,
  PaymentRequired as CorePaymentRequired,
} from "@x402/core/types";
import {
  authorizationTypes,
  ExactEvmScheme,
  type ClientEvmSigner,
} from "@x402/evm";
import {
  getAddress,
  isAddress,
  isHex,
  keccak256,
  stringToHex,
} from "viem";

const MAX_X402_TIMEOUT_SECONDS = 3_600;

export type BnbX402Requirement = Readonly<{
  amount?: string;
  asset: string;
  description?: string;
  extra?: Readonly<Record<string, unknown>> | null;
  maxAmountRequired?: string;
  maxTimeoutSeconds: number;
  mimeType?: string;
  network: string;
  payTo: string;
  resource?: string;
  scheme: string;
}>;

export type BnbX402Challenge = Readonly<{
  accepts: readonly BnbX402Requirement[];
  error?: string;
  extensions?: Readonly<Record<string, unknown>> | null;
  resource?: Readonly<Record<string, unknown>>;
  x402Version: 1 | 2;
}>;

export type BnbX402PaymentPayload =
  | Readonly<{
      network: string;
      payload: Readonly<Record<string, unknown>>;
      scheme: string;
      x402Version: 1;
    }>
  | Readonly<{
      accepted: BnbX402Requirement;
      extensions?: Readonly<Record<string, unknown>> | null;
      payload: Readonly<Record<string, unknown>>;
      resource?: Readonly<Record<string, unknown>>;
      x402Version: 2;
    }>;

export type X402Option = Readonly<{
  amount: string;
  asset: string;
  description: string | null;
  maxTimeoutSeconds: number;
  network: string;
  payTo: string;
  scheme: "exact";
  version: 1 | 2;
}>;

export type X402OptionPreference = Readonly<{
  asset: string;
  network: string;
  payTo: string;
}>;

export type ValidatedX402Payment = Readonly<{
  payer: `0x${string}`;
  payload: BnbX402PaymentPayload;
  requirement: BnbX402Requirement;
}>;

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function amountFor(requirement: BnbX402Requirement): string {
  return requirement.amount ?? requirement.maxAmountRequired ?? "";
}

function descriptionFor(requirement: BnbX402Requirement): string | null {
  return requirement.description || null;
}

function chainMatches(network: string, chainId: number): boolean {
  return (
    network.toLowerCase() === `eip155:${chainId}` ||
    (chainId === 56 && network.toLowerCase() === "bsc") ||
    (chainId === 97 && network.toLowerCase() === "bsc-testnet")
  );
}

function isPositiveUint256(value: string): boolean {
  try {
    const amount = BigInt(value);
    return amount > 0n && amount < 2n ** 256n;
  } catch {
    return false;
  }
}

function isEip3009(requirement: BnbX402Requirement): boolean {
  const extra = requirement.extra;
  const transferMethod =
    typeof extra?.assetTransferMethod === "string"
      ? extra.assetTransferMethod
      : typeof extra?.transferMethod === "string"
        ? extra.transferMethod
        : "eip3009";
  return transferMethod.toLowerCase() === "eip3009";
}

function hasSigningDomain(requirement: BnbX402Requirement): boolean {
  return (
    typeof requirement.extra?.name === "string" &&
    requirement.extra.name.length > 0 &&
    requirement.extra.name.length <= 128 &&
    typeof requirement.extra?.version === "string" &&
    requirement.extra.version.length > 0 &&
    requirement.extra.version.length <= 32
  );
}

function isSupportedRequirement(
  requirement: BnbX402Requirement,
  chainId: number,
): boolean {
  return (
    requirement.scheme.toLowerCase() === "exact" &&
    chainMatches(requirement.network, chainId) &&
    isAddress(requirement.asset) &&
    isAddress(requirement.payTo) &&
    isPositiveUint256(amountFor(requirement)) &&
    Number.isSafeInteger(requirement.maxTimeoutSeconds) &&
    requirement.maxTimeoutSeconds > 0 &&
    requirement.maxTimeoutSeconds <= MAX_X402_TIMEOUT_SECONDS &&
    isEip3009(requirement) &&
    hasSigningDomain(requirement)
  );
}

/**
 * Parse an untrusted x402 challenge and retain only exact EIP-3009 options on
 * the selected BNB network. Both the official v1 and v2 envelopes are accepted.
 */
export function parseBnbX402Challenge(
  value: unknown,
  chainId: number,
): BnbX402Challenge {
  let challenge: BnbX402Challenge;
  try {
    challenge = validatePaymentRequired(value) as unknown as BnbX402Challenge;
  } catch {
    throw new TypeError("The x402 service returned an invalid payment challenge.");
  }

  const accepts = challenge.accepts.filter((requirement) =>
    isSupportedRequirement(requirement, chainId),
  );
  if (accepts.length === 0) {
    throw new TypeError(
      "The x402 service did not offer a supported exact BNB Chain payment.",
    );
  }

  return { ...challenge, accepts };
}

export function x402OptionsFromChallenge(
  challenge: BnbX402Challenge,
): readonly X402Option[] {
  return challenge.accepts.map((requirement) => ({
    amount: amountFor(requirement),
    asset: requirement.asset,
    description: descriptionFor(requirement),
    maxTimeoutSeconds: requirement.maxTimeoutSeconds,
    network: requirement.network,
    payTo: requirement.payTo,
    scheme: "exact",
    version: challenge.x402Version,
  }));
}

function sameAddress(left: string, right: string): boolean {
  return isAddress(left) && isAddress(right) && getAddress(left) === getAddress(right);
}

export function selectX402Requirement(
  challenge: BnbX402Challenge,
  preference?: X402OptionPreference,
): BnbX402Requirement {
  if (!preference) return challenge.accepts[0]!;
  return (
    challenge.accepts.find(
      (requirement) =>
        requirement.network.toLowerCase() === preference.network.toLowerCase() &&
        sameAddress(requirement.asset, preference.asset) &&
        sameAddress(requirement.payTo, preference.payTo),
    ) ?? challenge.accepts[0]!
  );
}

export function challengeForRequirement(
  challenge: BnbX402Challenge,
  requirement: BnbX402Requirement,
): BnbX402Challenge {
  return { ...challenge, accepts: [requirement] };
}

function chainIdForNetwork(network: string, expectedChainId: number): number {
  if (!chainMatches(network, expectedChainId)) {
    throw new TypeError("The payment request is for a different network.");
  }
  return expectedChainId;
}

async function createLegacyPaymentPayload(
  challenge: BnbX402Challenge,
  signer: ClientEvmSigner,
  expectedChainId: number,
): Promise<BnbX402PaymentPayload> {
  if (challenge.x402Version !== 1 || challenge.accepts.length !== 1) {
    throw new TypeError("A single x402 v1 payment option is required.");
  }
  const requirement = challenge.accepts[0]!;
  const chainId = chainIdForNetwork(requirement.network, expectedChainId);
  const now = Math.floor(Date.now() / 1_000);
  const authorization = {
    from: getAddress(signer.address),
    nonce: keccak256(
      stringToHex(`${crypto.randomUUID()}:${Date.now()}:${signer.address}`),
    ),
    to: getAddress(requirement.payTo),
    validAfter: String(now - 600),
    validBefore: String(now + requirement.maxTimeoutSeconds),
    value: amountFor(requirement),
  };
  const signature = await signer.signTypedData({
    domain: {
      chainId,
      name: requirement.extra!.name,
      verifyingContract: getAddress(requirement.asset),
      version: requirement.extra!.version,
    },
    message: {
      from: authorization.from,
      nonce: authorization.nonce,
      to: authorization.to,
      validAfter: BigInt(authorization.validAfter),
      validBefore: BigInt(authorization.validBefore),
      value: BigInt(authorization.value),
    },
    primaryType: "TransferWithAuthorization",
    types: authorizationTypes,
  });

  return validatePaymentPayload({
    network: requirement.network,
    payload: { authorization, signature },
    scheme: "exact",
    x402Version: 1,
  }) as unknown as BnbX402PaymentPayload;
}

/** Build one exact payment authorization. This requests a wallet signature only. */
export async function createBnbX402PaymentPayload(
  challengeValue: unknown,
  signer: ClientEvmSigner,
  expectedChainId: number,
): Promise<BnbX402PaymentPayload> {
  const challenge = parseBnbX402Challenge(challengeValue, expectedChainId);
  if (challenge.accepts.length !== 1) {
    throw new TypeError("Choose one payment option before signing.");
  }
  if (challenge.x402Version === 1) {
    return createLegacyPaymentPayload(challenge, signer, expectedChainId);
  }

  const requirement = challenge.accepts[0]!;
  const client = new x402Client();
  // Sift performs its own exact live-quote and balance checks. The SDK's default
  // USD asset list does not include every BNB token legitimately published by
  // an agent, so its generic spend policy would incorrectly reject those tokens.
  client.setSpendControls(false);
  client.register(
    requirement.network as `${string}:${string}`,
    new ExactEvmScheme(signer),
  );
  return client.createPaymentPayload(
    challenge as unknown as CorePaymentRequired,
  ) as unknown as Promise<BnbX402PaymentPayload>;
}

function sameRequirement(
  left: BnbX402Requirement,
  right: BnbX402Requirement,
): boolean {
  return (
    left.scheme.toLowerCase() === right.scheme.toLowerCase() &&
    left.network.toLowerCase() === right.network.toLowerCase() &&
    sameAddress(left.asset, right.asset) &&
    sameAddress(left.payTo, right.payTo) &&
    amountFor(left) === amountFor(right) &&
    left.maxTimeoutSeconds === right.maxTimeoutSeconds
  );
}

/**
 * Bind an untrusted signed payload to a freshly fetched challenge. The remote
 * resource still performs the authoritative signature verification/settlement.
 */
export function validateX402PaymentPayload(
  value: unknown,
  challengeValue: unknown,
  expectedChainId: number,
  expectedPayer: string,
  now: number = Date.now(),
): ValidatedX402Payment {
  const challenge = parseBnbX402Challenge(challengeValue, expectedChainId);
  let payload: BnbX402PaymentPayload;
  try {
    payload = validatePaymentPayload(value) as unknown as BnbX402PaymentPayload;
  } catch {
    throw new TypeError("The wallet returned an invalid x402 authorization.");
  }
  if (payload.x402Version !== challenge.x402Version) {
    throw new TypeError("The live payment version changed. Refresh the quote.");
  }

  const body = record(payload.payload);
  const authorization = record(body?.authorization);
  const signature = body?.signature;
  if (
    !authorization ||
    typeof authorization.from !== "string" ||
    typeof authorization.to !== "string" ||
    typeof authorization.value !== "string" ||
    typeof authorization.validAfter !== "string" ||
    typeof authorization.validBefore !== "string" ||
    typeof authorization.nonce !== "string" ||
    typeof signature !== "string" ||
    !isAddress(authorization.from) ||
    !isAddress(authorization.to) ||
    !isHex(authorization.nonce, { strict: true }) ||
    authorization.nonce.length !== 66 ||
    !isHex(signature, { strict: true })
  ) {
    throw new TypeError("The wallet returned an incomplete x402 authorization.");
  }
  if (!sameAddress(authorization.from, expectedPayer)) {
    throw new TypeError("The payment was signed by a different wallet.");
  }

  let requirement: BnbX402Requirement | undefined;
  if (payload.x402Version === 2) {
    requirement = challenge.accepts.find((item) =>
      sameRequirement(item, payload.accepted),
    );
  } else {
    requirement = challenge.accepts.find(
      (item) =>
        item.scheme.toLowerCase() === payload.scheme.toLowerCase() &&
        item.network.toLowerCase() === payload.network.toLowerCase() &&
        sameAddress(item.payTo, authorization.to as string) &&
        amountFor(item) === authorization.value,
    );
  }
  if (!requirement) {
    throw new TypeError("The live payment request changed. Refresh the quote.");
  }
  if (
    !sameAddress(requirement.payTo, authorization.to) ||
    amountFor(requirement) !== authorization.value
  ) {
    throw new TypeError("The signed amount or recipient does not match the live quote.");
  }

  const validAfter = Number(authorization.validAfter);
  const validBefore = Number(authorization.validBefore);
  const nowSeconds = Math.floor(now / 1_000);
  if (
    !Number.isSafeInteger(validAfter) ||
    !Number.isSafeInteger(validBefore) ||
    validAfter > nowSeconds + 5 ||
    validBefore <= nowSeconds + 5 ||
    validBefore > nowSeconds + requirement.maxTimeoutSeconds + 120
  ) {
    throw new TypeError("The payment authorization has an invalid or expired time limit.");
  }

  return {
    payer: getAddress(authorization.from),
    payload,
    requirement,
  };
}

export function x402PaymentHeader(payload: BnbX402PaymentPayload): Readonly<{
  name: "PAYMENT-SIGNATURE" | "X-PAYMENT";
  value: string;
}> {
  const encoded = encodePaymentSignatureHeader(
    payload as unknown as CorePaymentPayload,
  );
  return {
    name: payload.x402Version === 1 ? "X-PAYMENT" : "PAYMENT-SIGNATURE",
    value: encoded,
  };
}

export function x402AmountFor(requirement: BnbX402Requirement): string {
  return amountFor(requirement);
}
