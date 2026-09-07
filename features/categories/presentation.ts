import type { CategorySlug } from "@/features/categories/taxonomy";
import type { MetadataStatus } from "@/lib/db/validation";

/**
 * "Other" is a display fallback, not persisted category evidence. It means
 * Sift validated the agent's profile but found no match in its four supported
 * marketplace categories. Invalid, unavailable, and pending profiles remain
 * explicitly uncategorized because their category cannot be established.
 */
export function shouldShowOtherCategory(
  metadataStatus: MetadataStatus,
  categories: readonly CategorySlug[],
): boolean {
  return metadataStatus === "valid" && categories.length === 0;
}
