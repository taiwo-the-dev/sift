import type {
  AgentProfile,
  AgentProfileService,
} from "@/features/agents/model";
import type {
  CategorySource,
  DiscoveryCategory,
} from "@/features/discovery/model";
import type { Json } from "@/lib/db/database.types";
import type { MetadataStatus } from "@/lib/db/validation";

const categoryRules = [
  {
    category: "yield-optimisation",
    pattern:
      /(^|[^a-z0-9])(yield|apy|apr|staking|stake|farming|farm|vault)([^a-z0-9]|$)/,
  },
  {
    category: "grid-trading",
    pattern:
      /(^|[^a-z0-9])(grid|trading|trader|trade|buy|sell|market[ -]?making)([^a-z0-9]|$)/,
  },
  {
    category: "health-factor-monitoring",
    pattern:
      /(^|[^a-z0-9])(health factor|liquidation|liquidate|lending|borrowing|borrow|collateral|loan)([^a-z0-9]|$)/,
  },
  {
    category: "liquidity-rebalancing",
    pattern:
      /(^|[^a-z0-9])(liquidity|rebalance|rebalancing|lp|pool|concentrated liquidity)([^a-z0-9]|$)/,
  },
] as const satisfies readonly Readonly<{
  category: DiscoveryCategory;
  pattern: RegExp;
}>[];

function isRecord(value: Json): value is Readonly<Record<string, Json | undefined>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function capabilityLabel(value: Json): string | null {
  if (typeof value === "string") {
    const label = value.trim();
    return label.length > 0 && label.length <= 100 ? label : null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const candidate =
    typeof value.name === "string"
      ? value.name
      : typeof value.id === "string"
        ? value.id
        : null;
  const label = candidate?.trim() ?? "";

  return label.length > 0 && label.length <= 100 ? label : null;
}

export function resolveProfileCategories(
  category: DiscoveryCategory | null,
  name: string | null,
  description: string | null,
  services: readonly AgentProfileService[],
): Readonly<{
  categories: readonly DiscoveryCategory[];
  categorySource: CategorySource;
}> {
  if (category) {
    return { categories: [category], categorySource: "indexed-metadata" };
  }

  const document = [
    name,
    description,
    ...services.flatMap((service) => [
      service.serviceType,
      JSON.stringify(service.metadata),
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const categories = categoryRules
    .filter((rule) => rule.pattern.test(document))
    .map((rule) => rule.category);

  return {
    categories,
    categorySource:
      categories.length > 0 ? "deterministic-keyword" : null,
  };
}

export function collectDeclaredCapabilities(
  services: readonly AgentProfileService[],
): readonly string[] {
  const labels = services.flatMap((service) => {
    const metadata = service.metadata;

    if (!isRecord(metadata)) {
      return [];
    }

    return ["skills", "capabilities", "domains", "tags"].flatMap((key) => {
      const value = metadata[key];

      if (!Array.isArray(value)) {
        return [];
      }

      return value.flatMap((entry) => {
        const label = capabilityLabel(entry);
        return label ? [label] : [];
      });
    });
  });

  return [...new Set(labels)].slice(0, 24);
}

export type ProfileProvenance = Readonly<{
  description: string;
  isStale: boolean;
  label: string;
  tone: "good" | "caution" | "neutral";
}>;

export function describeProfileProvenance(
  metadataStatus: MetadataStatus,
  hasRetainedMetadata: boolean,
  metadataVerifiedAt: string | null,
): ProfileProvenance {
  if (metadataStatus === "valid") {
    return {
      description: metadataVerifiedAt
        ? "The displayed registration metadata passed Sift's latest indexed validation."
        : "The displayed metadata is currently valid; its successful verification time was not recorded by the earlier indexer version.",
      isStale: false,
      label: "Validated indexed metadata",
      tone: "good",
    };
  }

  if (metadataStatus === "pending") {
    return {
      description:
        "The blockchain identity is indexed, but its off-chain metadata has not completed validation yet.",
      isStale: false,
      label: "Metadata validation pending",
      tone: "neutral",
    };
  }

  if (hasRetainedMetadata) {
    return {
      description: metadataVerifiedAt
        ? "The latest refresh did not validate successfully. Sift is showing the last successfully verified representation."
        : "The latest refresh did not validate successfully. Retained indexed fields are shown, but the earlier successful verification time is unavailable.",
      isStale: true,
      label: "Last-known-good metadata",
      tone: "caution",
    };
  }

  return {
    description:
      "The on-chain identity is indexed, but no successfully validated human-readable metadata is currently available.",
    isStale: false,
    label:
      metadataStatus === "invalid"
        ? "Invalid metadata"
        : "Metadata unavailable",
    tone: "caution",
  };
}

export function hasHumanReadableMetadata(
  profile: Pick<AgentProfile, "description" | "imageUrl" | "name" | "services">,
): boolean {
  return Boolean(
    profile.name ||
      profile.description ||
      profile.imageUrl ||
      profile.services.length > 0,
  );
}
