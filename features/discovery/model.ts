import type { MetadataStatus } from "@/lib/db/validation";
import type { HealthSnapshot } from "@/features/health/model";
import type { PersistedSiftScore } from "@/features/scoring/model";

export const discoveryCategorySlugs = [
  "yield-optimisation",
  "grid-trading",
  "health-factor-monitoring",
  "liquidity-rebalancing",
] as const;

export type DiscoveryCategory = (typeof discoveryCategorySlugs)[number];

export const discoveryCategories = [
  {
    description: "Yield research, farming and position optimisation",
    label: "Yield Optimisation",
    slug: "yield-optimisation",
  },
  {
    description: "Grid and rule-based market automation",
    label: "Grid Trading",
    slug: "grid-trading",
  },
  {
    description: "Collateral and liquidation-risk monitoring",
    label: "Health Factor Monitoring",
    slug: "health-factor-monitoring",
  },
  {
    description: "Liquidity range and allocation management",
    label: "Liquidity Rebalancing",
    slug: "liquidity-rebalancing",
  },
] as const satisfies readonly Readonly<{
  description: string;
  label: string;
  slug: DiscoveryCategory;
}>[];

export const discoveryMetadataStatuses = [
  { label: "Validated metadata", value: "valid" },
  { label: "Invalid metadata", value: "invalid" },
  { label: "Unavailable metadata", value: "unavailable" },
  { label: "Pending validation", value: "pending" },
] as const satisfies readonly Readonly<{
  label: string;
  value: MetadataStatus;
}>[];

export const discoverySortOptions = [
  { label: "Best text match", value: "relevance" },
  { label: "Recently registered", value: "recent" },
  { label: "Oldest registered", value: "oldest" },
  { label: "Name A–Z", value: "name-asc" },
] as const;

export type DiscoverySort =
  (typeof discoverySortOptions)[number]["value"];

export const discoveryPageSizes = [12, 24, 36] as const;
export type DiscoveryPageSize = (typeof discoveryPageSizes)[number];

export type CategorySource =
  | "indexed-metadata"
  | "deterministic-keyword"
  | null;

export type DiscoveryService = Readonly<{
  serviceType: string;
  version: string | null;
}>;

export type DiscoveryAgent = Readonly<{
  active: boolean | null;
  agentDbId: string;
  agentId: string;
  categories: readonly DiscoveryCategory[];
  categorySource: CategorySource;
  chainId: number;
  description: string | null;
  health: HealthSnapshot | null;
  imageUrl: string | null;
  lastSyncedAt: string | null;
  metadataStatus: MetadataStatus;
  name: string | null;
  ownerAddress: string | null;
  registeredAt: string | null;
  registeredBlock: number | null;
  registryAddress: string;
  relevance: number;
  score: PersistedSiftScore | null;
  services: readonly DiscoveryService[];
  x402Supported: boolean | null;
}>;

export type DiscoveryQuery = Readonly<{
  categories: readonly DiscoveryCategory[];
  effectiveCategories: readonly DiscoveryCategory[];
  inferredCategory: DiscoveryCategory | null;
  metadataStatuses: readonly MetadataStatus[];
  page: number;
  pageSize: DiscoveryPageSize;
  query: string;
  searchTerms: readonly string[];
  sort: DiscoverySort;
}>;

export type DiscoveryResult = Readonly<{
  agents: readonly DiscoveryAgent[];
  page: number;
  pageSize: DiscoveryPageSize;
  totalCount: number;
  totalPages: number;
}>;
