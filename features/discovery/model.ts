import type { MetadataStatus } from "@/lib/db/validation";
import type {
  HealthSnapshot,
  HealthStatus,
} from "@/features/health/model";
import type { PersistedSiftScore } from "@/features/scoring/model";
import type {
  CategoryEvidence,
  CategoryEvidenceSource,
  CategorySlug,
} from "@/features/categories/taxonomy";
import { categorySlugs } from "@/features/categories/taxonomy";

export const discoveryCategorySlugs = categorySlugs;

export type DiscoveryCategory = CategorySlug;

export const discoveryCategories = [
  {
    description: "Routes liquidity across available yield opportunities",
    label: "Yield Optimisation",
    slug: "yield-optimisation",
  },
  {
    description: "Places and manages automated grid strategies",
    label: "Grid Trading",
    slug: "grid-trading",
  },
  {
    description: "Monitors lending positions and liquidation risk",
    label: "Health Factor Monitoring",
    slug: "health-factor-monitoring",
  },
  {
    description: "Manages LP ranges and rebalances liquidity positions",
    label: "Liquidity Rebalancing",
    slug: "liquidity-rebalancing",
  },
] as const satisfies readonly Readonly<{
  description: string;
  label: string;
  slug: DiscoveryCategory;
}>[];

export const discoveryMetadataStatuses = [
  { label: "Verified profile", value: "valid" },
  { label: "Invalid profile data", value: "invalid" },
  { label: "No profile data", value: "unavailable" },
  { label: "Verification pending", value: "pending" },
] as const satisfies readonly Readonly<{
  label: string;
  value: MetadataStatus;
}>[];

export const discoveryHealthStatuses = [
  { label: "Online", value: "online" },
  { label: "Degraded", value: "degraded" },
  { label: "Offline", value: "offline" },
  { label: "Unknown / not checked", value: "unknown" },
] as const satisfies readonly Readonly<{
  label: string;
  value: HealthStatus;
}>[];

export const discoverySortOptions = [
  { label: "Best match", value: "relevance" },
  { label: "Newest first", value: "recent" },
  { label: "Oldest first", value: "oldest" },
  { label: "Verified profiles first", value: "profile-first" },
  { label: "Name A–Z", value: "name-asc" },
  { label: "Name Z–A", value: "name-desc" },
] as const;

export type DiscoverySort =
  (typeof discoverySortOptions)[number]["value"];

export const discoveryNetworkOptions = [
  {
    chainIds: [56],
    description: "ERC-8004 agents registered on BSC Mainnet",
    label: "BSC Mainnet",
    value: "bsc-mainnet",
  },
  {
    chainIds: [97],
    description: "ERC-8004 agents registered on BSC Testnet",
    label: "BSC Testnet",
    value: "bsc-testnet",
  },
  {
    chainIds: [56, 97],
    description: "Browse agents across both supported networks",
    label: "All supported networks",
    value: "all",
  },
] as const;

export type DiscoveryNetworkScope =
  (typeof discoveryNetworkOptions)[number]["value"];

export function getDiscoveryChainIds(
  scope: DiscoveryNetworkScope,
): readonly number[] {
  return discoveryNetworkOptions.find((option) => option.value === scope)
    ?.chainIds ?? [56];
}

export const discoveryPageSizes = [12, 24, 36] as const;
export type DiscoveryPageSize = (typeof discoveryPageSizes)[number];

export type CategorySource = CategoryEvidenceSource | null;

export type DiscoveryService = Readonly<{
  serviceType: string;
  version: string | null;
}>;

export type DiscoveryAgent = Readonly<{
  active: boolean | null;
  agentDbId: string;
  agentId: string;
  categories: readonly DiscoveryCategory[];
  categoryEvidence: readonly CategoryEvidence[];
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
  healthStatuses: readonly HealthStatus[];
  inferredCategory: DiscoveryCategory | null;
  metadataStatuses: readonly MetadataStatus[];
  network: DiscoveryNetworkScope;
  networkChainIds: readonly number[];
  page: number;
  pageSize: DiscoveryPageSize;
  query: string;
  searchTerms: readonly string[];
  sort: DiscoverySort;
}>;

export type DiscoveryResult = Readonly<{
  agents: readonly DiscoveryAgent[];
  hasNextPage: boolean;
  page: number;
  pageSize: DiscoveryPageSize;
  totalCount: number | null;
}>;
