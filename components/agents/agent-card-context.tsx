import { BadgeCheck, CircleAlert, Database, Tag } from "lucide-react";

import {
  formatCategory,
  formatChainName,
  formatMetadataStatus,
} from "@/features/discovery/format";
import type { DiscoveryCategory } from "@/features/discovery/model";
import type { MetadataStatus } from "@/lib/db/validation";
import { cn } from "@/lib/utils";

const metadataStatusTextStyles = {
  invalid: "text-amber-200",
  pending: "text-sky-200",
  unavailable: "text-white/55",
  valid: "text-emerald-300",
} as const;

export function AgentCardContext({
  category,
  categoryTitle,
  chainId,
}: Readonly<{
  category: DiscoveryCategory | undefined;
  categoryTitle?: string;
  chainId: number;
}>) {
  const categoryLabel = category ? formatCategory(category) : "Other";

  return (
    <div className="flex min-w-0 items-center justify-between gap-3">
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[0.62rem] font-semibold text-white/75 backdrop-blur-sm">
        <Database className="size-2.5 text-brand" aria-hidden="true" />
        {formatChainName(chainId)}
      </span>
      <span
        title={categoryTitle ?? categoryLabel}
        className={cn(
          "inline-flex min-w-0 max-w-[58%] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.62rem] font-semibold backdrop-blur-sm",
          category
            ? "border-brand/30 bg-brand/12 text-brand"
            : "border-white/10 bg-black/25 text-white/65",
        )}
      >
        <Tag className="size-2.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{categoryLabel}</span>
      </span>
    </div>
  );
}

export function AgentVerificationStatus({
  status,
}: Readonly<{ status: MetadataStatus }>) {
  const Icon = status === "valid" ? BadgeCheck : CircleAlert;

  return (
    <span
      className={cn(
        "mt-2 inline-flex items-center gap-1.5 text-[0.65rem] font-semibold",
        metadataStatusTextStyles[status],
      )}
    >
      <Icon className="size-3" aria-hidden="true" />
      {formatMetadataStatus(status)}
    </span>
  );
}
