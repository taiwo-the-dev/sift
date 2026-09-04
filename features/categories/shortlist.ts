import type { CategorySlug } from "@/features/categories/taxonomy";

export const CATEGORY_SHORTLIST_VERSION = "sift-category-shortlist-2026-09-03";

export type CuratedAgentReference = Readonly<{
  agentId: string;
  category: CategorySlug;
  rationale: string;
  rank: number;
}>;

/**
 * Real BSC Mainnet identities selected from Sift's completed ERC-8004 index.
 * The curation command refuses to persist an entry unless current validated
 * metadata, a matching category-evidence row, a description and a declared
 * HTTPS service are all present. Rank is editorial ordering, not performance.
 */
export const curatedMainnetAgents = [
  {
    agentId: "326106",
    category: "yield-optimisation",
    rank: 1,
    rationale: "Declares multi-protocol yield comparison and an agent service.",
  },
  {
    agentId: "322046",
    category: "yield-optimisation",
    rank: 2,
    rationale: "Declares read-only Venus yield research and service endpoints.",
  },
  {
    agentId: "315946",
    category: "yield-optimisation",
    rank: 3,
    rationale: "Declares a bounded Venus yield-routing scope and service.",
  },
  {
    agentId: "323332",
    category: "grid-trading",
    rank: 1,
    rationale: "Declares fixed grid ranges and a source-backed agent service.",
  },
  {
    agentId: "330536",
    category: "grid-trading",
    rank: 2,
    rationale: "Declares grid-level automation with agent service metadata.",
  },
  {
    agentId: "324936",
    category: "grid-trading",
    rank: 3,
    rationale: "Declares a grid-trading scope and an A2A service.",
  },
  {
    agentId: "331625",
    category: "health-factor-monitoring",
    rank: 1,
    rationale: "Declares Venus health-factor monitoring and an A2A service.",
  },
  {
    agentId: "330663",
    category: "health-factor-monitoring",
    rank: 2,
    rationale: "Declares lending health-factor monitoring and agent services.",
  },
  {
    agentId: "322885",
    category: "health-factor-monitoring",
    rank: 3,
    rationale: "Declares Venus liquidation monitoring and service protocols.",
  },
  {
    agentId: "315944",
    category: "liquidity-rebalancing",
    rank: 1,
    rationale: "Declares PancakeSwap V3 LP rebalancing and a service.",
  },
  {
    agentId: "325413",
    category: "liquidity-rebalancing",
    rank: 2,
    rationale: "Declares LP rebalancing and agent service metadata.",
  },
  {
    agentId: "265375",
    category: "liquidity-rebalancing",
    rank: 3,
    rationale: "Declares concentrated-liquidity range rebalancing and a service.",
  },
] as const satisfies readonly CuratedAgentReference[];
