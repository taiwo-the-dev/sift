import { formatUnits, isAddress, parseUnits, type Address } from "viem";
import { z } from "zod";

import type { HiringMissionInput } from "@/features/hiring/model";
import {
  getErc8183Deployment,
  type HiringChainId,
} from "@/features/hiring/protocol";

export const hiringDurations = [7_200, 86_400, 604_800, 2_592_000] as const;
export type HiringDuration = (typeof hiringDurations)[number];

const canonicalUint256Pattern = /^(0|[1-9][0-9]{0,77})$/;
const canonicalDecimalPattern = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/;
const maximumUint256 = (1n << 256n) - 1n;

const normalizedText = (minimum: number, maximum: number, label: string) =>
  z
    .string()
    .transform((value) => value.replaceAll("\r\n", "\n").trim())
    .pipe(
      z
        .string()
        .min(minimum, `${label} must be at least ${minimum} characters.`)
        .max(maximum, `${label} must be at most ${maximum} characters.`)
        .refine(
          (value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value),
          `${label} contains unsupported control characters.`,
        ),
    );

export function createHiringMissionSchema(chainId: HiringChainId) {
  const deployment = getErc8183Deployment(chainId);
  const maximumSpendBaseUnits = parseUnits("1000", deployment.tokenDecimals);

  return z.object({
    deliverables: normalizedText(10, 700, "Deliverables"),
    durationSeconds: z
      .number()
      .int()
      .refine(
        (value): value is HiringDuration =>
          hiringDurations.some((duration) => duration === value),
        "Choose a supported job duration.",
      ),
    maxSpend: z.string().transform((value, context) => {
      const normalized = value.trim();
      const match = canonicalDecimalPattern.exec(normalized);

      if (!match || (match[1]?.length ?? 0) > 60) {
        context.addIssue({
          code: "custom",
          message: "Maximum spend must be a non-negative decimal amount.",
        });
        return z.NEVER;
      }

      if ((match[2]?.length ?? 0) > deployment.tokenDecimals) {
        context.addIssue({
          code: "custom",
          message: `Maximum spend supports up to ${deployment.tokenDecimals} decimal places.`,
        });
        return z.NEVER;
      }

      try {
        const amount = parseUnits(normalized, deployment.tokenDecimals);

        if (amount > maximumSpendBaseUnits) {
          context.addIssue({
            code: "custom",
            message: `Maximum spend cannot exceed 1,000 ${deployment.tokenSymbol}.`,
          });
          return z.NEVER;
        }

        return normalized;
      } catch {
        context.addIssue({
          code: "custom",
          message: "Maximum spend is outside the supported range.",
        });
        return z.NEVER;
      }
    }),
    mission: normalizedText(20, 1_500, "Task description"),
    qualityStandards: normalizedText(10, 700, "Quality standards"),
  });
}

export function parseHiringMission(
  input: unknown,
  chainId: HiringChainId,
): HiringMissionInput {
  return createHiringMissionSchema(chainId).parse(input);
}

export function parseCanonicalUint256(value: unknown, label: string): bigint {
  if (typeof value !== "string" || !canonicalUint256Pattern.test(value)) {
    throw new TypeError(`${label} must be a canonical uint256 integer string.`);
  }

  const parsed = BigInt(value);

  if (parsed > maximumUint256) {
    throw new TypeError(`${label} exceeds uint256.`);
  }

  return parsed;
}

export function maximumSpendToBaseUnits(
  value: string,
  chainId: HiringChainId,
): bigint {
  const deployment = getErc8183Deployment(chainId);
  const parsed = createHiringMissionSchema(chainId).shape.maxSpend.parse(value);
  return parseUnits(parsed, deployment.tokenDecimals);
}

export function formatTokenAmount(value: bigint, decimals: number): string {
  const [integer, fraction = ""] = formatUnits(value, decimals).split(".");
  const compactFraction = fraction.replace(/0+$/, "").slice(0, 6);
  return compactFraction ? `${integer}.${compactFraction}` : integer;
}

export function parseHiringAddress(value: unknown, label: string): Address {
  if (typeof value !== "string" || !isAddress(value)) {
    throw new TypeError(`${label} must be a valid EVM address.`);
  }

  return value;
}

export function calculateExpiry(
  durationSeconds: number,
  nowMilliseconds: number = Date.now(),
): Date {
  if (!hiringDurations.some((duration) => duration === durationSeconds)) {
    throw new TypeError("Unsupported execution duration.");
  }

  const expiry = new Date(nowMilliseconds + durationSeconds * 1_000);
  expiry.setUTCMilliseconds(0);
  return expiry;
}
