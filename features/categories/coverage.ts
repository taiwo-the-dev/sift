import {
  CATEGORY_TAXONOMY_VERSION,
  categorySlugs,
} from "@/features/categories/taxonomy";
import type { CategoryCoverage } from "@/lib/db/category-repository";

export const MINIMUM_SHORTLIST_SIZE = 3;

export function buildCategoryCoverageReport(
  coverage: readonly CategoryCoverage[],
  observedAt: string,
) {
  if (Number.isNaN(Date.parse(observedAt))) {
    throw new TypeError("Coverage report observation time is invalid.");
  }

  const byCategory = new Map(coverage.map((row) => [row.category, row]));
  const categories = categorySlugs.map((category) => {
    const row = byCategory.get(category);
    return (
      row ?? {
        activationAvailable: 0,
        category,
        externalCrossChecks: 0,
        inventory: 0,
        latestObservedAt: null,
        shortlistCount: 0,
        validMetadata: 0,
        withEndpoint: 0,
        withHealth: 0,
        withImage: 0,
        withReputation: 0,
        withScore: 0,
        withServices: 0,
      }
    );
  });
  const issues = categories.flatMap((row) => [
    ...(row.inventory < MINIMUM_SHORTLIST_SIZE
      ? [`${row.category} has fewer than ${MINIMUM_SHORTLIST_SIZE} classified mainnet agents.`]
      : []),
    ...(row.shortlistCount < MINIMUM_SHORTLIST_SIZE
      ? [`${row.category} has fewer than ${MINIMUM_SHORTLIST_SIZE} validated shortlist entries.`]
      : []),
    ...(row.externalCrossChecks < MINIMUM_SHORTLIST_SIZE
      ? [`${row.category} has fewer than ${MINIMUM_SHORTLIST_SIZE} recorded 8004scan cross-checks.`]
      : []),
  ]);

  return {
    activationPolicy: {
      mainnetWritesEnabled: true,
      note: "ERC-8183 hiring is available only through the separately verified BSC Mainnet and BSC Testnet deployments.",
      supportedHiringChainIds: [56, 97] as const,
    },
    categories,
    chainId: 56,
    event: "category_coverage_report",
    issues,
    observedAt,
    status: issues.length === 0 ? ("pass" as const) : ("blocked" as const),
    taxonomyVersion: CATEGORY_TAXONOMY_VERSION,
  };
}
