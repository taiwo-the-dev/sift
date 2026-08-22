import {
  discoveryCategorySlugs,
  discoveryMetadataStatuses,
  discoveryPageSizes,
  discoverySortOptions,
  type DiscoveryCategory,
  type DiscoveryPageSize,
  type DiscoveryQuery,
  type DiscoverySort,
} from "@/features/discovery/model";
import type { MetadataStatus } from "@/lib/db/validation";

export type DiscoverySearchParams = Readonly<
  Record<string, string | string[] | undefined>
>;

const maximumQueryLength = 180;
const maximumSearchTerms = 10;
const defaultPageSize: DiscoveryPageSize = 12;

const stopWords = new Set([
  "a",
  "agent",
  "ai",
  "an",
  "and",
  "automatically",
  "do",
  "for",
  "help",
  "i",
  "in",
  "me",
  "my",
  "of",
  "on",
  "please",
  "safely",
  "that",
  "the",
  "to",
  "want",
  "with",
  "without",
]);

const intentRules = [
  {
    category: "yield-optimisation",
    keywords: [
      ["yield", 3],
      ["earn", 2],
      ["apy", 2],
      ["apr", 2],
      ["farm", 2],
      ["farming", 2],
      ["stake", 2],
      ["staking", 2],
    ],
  },
  {
    category: "grid-trading",
    keywords: [
      ["grid", 4],
      ["trading", 3],
      ["trade", 3],
      ["trades", 3],
      ["trader", 3],
      ["buy", 1],
      ["sell", 1],
    ],
  },
  {
    category: "health-factor-monitoring",
    keywords: [
      ["health factor", 4],
      ["liquidation", 3],
      ["liquidated", 3],
      ["loan", 2],
      ["borrow", 2],
      ["borrowing", 2],
      ["collateral", 2],
    ],
  },
  {
    category: "liquidity-rebalancing",
    keywords: [
      ["liquidity", 4],
      ["rebalance", 3],
      ["rebalancing", 3],
      ["lp", 3],
      ["pool", 2],
      ["range", 1],
    ],
  },
] as const satisfies readonly Readonly<{
  category: DiscoveryCategory;
  keywords: readonly (readonly [string, number])[];
}>[];

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function values(value: string | string[] | undefined): readonly string[] {
  if (value === undefined) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function uniqueSupported<Value extends string>(
  input: readonly string[],
  supported: readonly Value[],
): readonly Value[] {
  const supportedValues = new Set<string>(supported);
  return [...new Set(input)].filter((value): value is Value =>
    supportedValues.has(value),
  );
}

function normalizeQuery(value: string | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maximumQueryLength);
}

function hasKeyword(normalizedQuery: string, keyword: string): boolean {
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escapedKeyword}([^a-z0-9]|$)`, "i").test(
    normalizedQuery,
  );
}

export function inferDiscoveryCategory(
  query: string,
): DiscoveryCategory | null {
  const normalizedQuery = query.normalize("NFKC").toLowerCase();
  let bestMatch: Readonly<{ category: DiscoveryCategory; score: number }> | null =
    null;

  for (const rule of intentRules) {
    const score = rule.keywords.reduce(
      (total, [keyword, weight]) =>
        total + (hasKeyword(normalizedQuery, keyword) ? weight : 0),
      0,
    );

    if (score > 0 && (bestMatch === null || score > bestMatch.score)) {
      bestMatch = { category: rule.category, score };
    }
  }

  return bestMatch?.category ?? null;
}

export function extractDiscoverySearchTerms(query: string): readonly string[] {
  const tokens = query
    .normalize("NFKC")
    .toLowerCase()
    .match(/[a-z0-9]+/g);

  if (!tokens) {
    return [];
  }

  return [...new Set(tokens)]
    .filter((token) => token.length >= 2 && !stopWords.has(token))
    .slice(0, maximumSearchTerms);
}

function parsePositiveInteger(value: string | undefined): number {
  if (!value || !/^\d+$/.test(value)) {
    return 1;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, 10000)
    : 1;
}

function parsePageSize(value: string | undefined): DiscoveryPageSize {
  const parsed = Number(value);
  return discoveryPageSizes.find((size) => size === parsed) ?? defaultPageSize;
}

function parseSort(
  value: string | undefined,
  hasQuery: boolean,
): DiscoverySort {
  const supportedSort = discoverySortOptions.find(
    (option) => option.value === value,
  )?.value;

  if (supportedSort === "relevance" && !hasQuery) {
    return "recent";
  }

  return supportedSort ?? (hasQuery ? "relevance" : "recent");
}

export function parseDiscoverySearchParams(
  params: DiscoverySearchParams,
): DiscoveryQuery {
  const query = normalizeQuery(firstValue(params.q));
  const categories = uniqueSupported(
    values(params.category),
    discoveryCategorySlugs,
  );
  const metadataStatuses = uniqueSupported(
    values(params.metadata),
    discoveryMetadataStatuses.map((status) => status.value),
  ) as readonly MetadataStatus[];
  const inferredCategory = inferDiscoveryCategory(query);

  return {
    categories,
    effectiveCategories:
      categories.length > 0
        ? categories
        : inferredCategory
          ? [inferredCategory]
          : [],
    inferredCategory,
    metadataStatuses,
    page: parsePositiveInteger(firstValue(params.page)),
    pageSize: parsePageSize(firstValue(params.size)),
    query,
    searchTerms: extractDiscoverySearchTerms(query),
    sort: parseSort(firstValue(params.sort), query.length > 0),
  };
}

export type DiscoveryQueryOverrides = Readonly<{
  categories?: readonly DiscoveryCategory[];
  metadataStatuses?: readonly MetadataStatus[];
  page?: number;
  pageSize?: DiscoveryPageSize;
  query?: string;
  sort?: DiscoverySort;
}>;

export function buildDiscoveryHref(
  query: DiscoveryQuery,
  overrides: DiscoveryQueryOverrides = {},
): string {
  const nextQuery = overrides.query ?? query.query;
  const nextCategories = overrides.categories ?? query.categories;
  const nextStatuses = overrides.metadataStatuses ?? query.metadataStatuses;
  const nextPage = overrides.page ?? query.page;
  const nextSize = overrides.pageSize ?? query.pageSize;
  const nextSort = overrides.sort ?? query.sort;
  const params = new URLSearchParams();

  if (nextQuery) {
    params.set("q", nextQuery);
  }

  for (const category of nextCategories) {
    params.append("category", category);
  }

  for (const status of nextStatuses) {
    params.append("metadata", status);
  }

  if (nextSort !== (nextQuery ? "relevance" : "recent")) {
    params.set("sort", nextSort);
  }

  if (nextSize !== defaultPageSize) {
    params.set("size", String(nextSize));
  }

  if (nextPage > 1) {
    params.set("page", String(nextPage));
  }

  const serialized = params.toString();
  return serialized ? `/discover?${serialized}` : "/discover";
}
