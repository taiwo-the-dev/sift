import type { CategorySlug } from "@/features/categories/taxonomy";

/**
 * "Other" is a display fallback, not persisted category evidence. Any agent
 * with no match in Sift's four supported marketplace categories is labeled
 * Other, so every listed agent always carries a category.
 */
export function shouldShowOtherCategory(
  categories: readonly CategorySlug[],
): boolean {
  return categories.length === 0;
}
