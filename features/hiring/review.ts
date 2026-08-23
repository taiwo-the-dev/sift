import { formatTokenAmount } from "@/features/hiring/validation";

export function formatDuration(seconds: number): string {
  if (seconds % 86_400 === 0) {
    const days = seconds / 86_400;
    return `${days} day${days === 1 ? "" : "s"}`;
  }

  const hours = seconds / 3_600;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export function formatBasisPointPercent(basisPoints: number): string {
  if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000) {
    throw new TypeError("Basis points must be an integer from 0 to 10,000.");
  }

  const whole = Math.floor(basisPoints / 100);
  const remainder = basisPoints % 100;
  return remainder === 0
    ? `${whole}%`
    : `${whole}.${String(remainder).padStart(2, "0").replace(/0$/, "")}%`;
}

export function formatReviewAmount(
  baseUnits: string,
  decimals: number,
  symbol: string,
): string {
  return `${formatTokenAmount(BigInt(baseUnits), decimals)} ${symbol}`;
}

export function hiringExpiryLabel(isoTimestamp: string): string {
  const date = new Date(isoTimestamp);

  if (Number.isNaN(date.getTime())) {
    return "Invalid expiry";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date) + " UTC";
}

