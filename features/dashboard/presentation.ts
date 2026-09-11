import type {
  DashboardActivitySource,
  DashboardJobCategory,
} from "@/features/dashboard/model";

const timestampFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatDashboardTimestamp(value: string | null): string {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : `${timestampFormatter.format(date)} UTC`;
}

export function formatDashboardStep(value: string | null): string {
  if (!value) return "No pending wallet step";
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function dashboardCategoryLabel(category: DashboardJobCategory): string {
  return category === "failed" ? "Failed / cancelled" : `${category.charAt(0).toUpperCase()}${category.slice(1)}`;
}

export function dashboardActivitySourceLabel(
  source: DashboardActivitySource,
): string {
  if (source === "onchain") return "Blockchain record";
  if (source === "indexed-observation") return "Blockchain status check";
  return "Sift record";
}

export function dashboardTransactionHref(
  hash: string | null,
  chainId: number = 56,
): string | null {
  const explorerBaseUrl =
    chainId === 97 ? "https://testnet.bscscan.com" : "https://bscscan.com";

  return hash && /^0x[0-9a-fA-F]{64}$/.test(hash)
    ? `${explorerBaseUrl}/tx/${hash}`
    : null;
}
