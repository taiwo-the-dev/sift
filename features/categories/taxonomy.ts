import type { Json } from "@/lib/db/database.types";
import type { NormalizedService } from "@/lib/indexer/metadata/normalize";

export const CATEGORY_TAXONOMY_VERSION = "sift-category-taxonomy-v1.0.0";

export const categorySlugs = [
  "yield-optimisation",
  "grid-trading",
  "health-factor-monitoring",
  "liquidity-rebalancing",
] as const;

export type CategorySlug = (typeof categorySlugs)[number];
export type CategoryEvidenceSource =
  | "declared-metadata"
  | "deterministic-rule";

export type CategoryFact = Readonly<{
  key: "asset" | "behavior" | "market" | "position" | "protocol" | "service";
  label: string;
  sourceField: string;
  value: string;
}>;

export type CategoryEvidence = Readonly<{
  category: CategorySlug;
  confidence: number;
  facts: readonly CategoryFact[];
  matchedTerms: readonly string[];
  observedAt: string;
  ruleVersion: typeof CATEGORY_TAXONOMY_VERSION;
  source: CategoryEvidenceSource;
}>;

type ClassificationService = Pick<
  NormalizedService,
  "endpoint" | "metadata" | "serviceType" | "version"
>;

export type CategoryClassificationInput = Readonly<{
  declaredCategories?: readonly string[];
  description: string | null;
  name: string | null;
  observedAt: string;
  services: readonly ClassificationService[];
}>;

type TaxonomyDefinition = Readonly<{
  aliases: readonly string[];
  description: string;
  inferencePatterns: readonly Readonly<{ label: string; pattern: RegExp }>[];
  label: string;
  slug: CategorySlug;
}>;

export const categoryTaxonomy = [
  {
    aliases: ["yield", "yield optimization", "yield optimisation"],
    description:
      "Finds and manages yield opportunities across supported protocols, farms, and vaults.",
    inferencePatterns: [
      { label: "yield optimisation", pattern: /\byield optimi[sz](?:e|es|ed|ing|er|ation)\b/i },
      { label: "yield strategy", pattern: /\byield strateg(?:y|ies)\b/i },
      { label: "yield routing", pattern: /\byield rout(?:e|er|ing)\b/i },
      { label: "yield research", pattern: /\byield (?:analysis|comparison|lens|research)\b/i },
      { label: "APR/APY comparison", pattern: /\b(?:apr|apy)(?:[- ]ranked| comparison| optimisation| optimization)\b/i },
      { label: "vault strategy", pattern: /\bvault(?:s| strategy| optimisation| optimization)\b/i },
    ],
    label: "Yield Optimisation",
    slug: "yield-optimisation",
  },
  {
    aliases: ["grid", "grid trading", "grid trader"],
    description:
      "Creates, monitors, or runs grid-trading strategies for supported markets.",
    inferencePatterns: [
      { label: "explicit grid label", pattern: /^\s*grid\s*$/i },
      { label: "grid trading", pattern: /\bgrid trad(?:e|er|ing)\b/i },
      { label: "grid levels", pattern: /\bgrid levels?\b/i },
      { label: "bounded grid", pattern: /\bbounded grids?\b/i },
      { label: "grid strategy", pattern: /\bgrid strateg(?:y|ies)\b/i },
    ],
    label: "Grid Trading",
    slug: "grid-trading",
  },
  {
    aliases: [
      "health factor",
      "health factor monitoring",
      "liquidation monitoring",
    ],
    description:
      "Tracks lending positions, collateral health, and liquidation risk.",
    inferencePatterns: [
      { label: "health factor", pattern: /\bhealth[- ]factor(?:s|[- ]monitor|[- ]monitoring)?\b/i },
      { label: "liquidation risk", pattern: /\bliquidation risk\b/i },
      { label: "liquidation alert", pattern: /\bliquidation alert(?:s|ing)?\b/i },
      { label: "collateral health", pattern: /\bcollateral health\b/i },
    ],
    label: "Health Factor Monitoring",
    slug: "health-factor-monitoring",
  },
  {
    aliases: [
      "liquidity rebalancing",
      "lp rebalancing",
      "range management",
    ],
    description:
      "Monitors or adjusts liquidity positions, allocations, and price ranges.",
    inferencePatterns: [
      { label: "liquidity rebalancing", pattern: /\bliquidity rebalanc(?:e|es|ed|ing)\b/i },
      { label: "LP rebalancing", pattern: /\blp rebalanc(?:e|es|ed|ing|er)\b/i },
      { label: "concentrated liquidity", pattern: /\bconcentrated liquidity\b/i },
      { label: "range management", pattern: /\brange (?:manager|management|reset|rebalanc(?:e|es|ed|ing|er))\b/i },
      { label: "LP range", pattern: /\blp ranges?\b/i },
    ],
    label: "Liquidity Rebalancing",
    slug: "liquidity-rebalancing",
  },
] as const satisfies readonly TaxonomyDefinition[];

const factDictionaries = {
  asset: ["BNB", "USDT", "USDC", "BTCB", "ETH"],
  behavior: [
    "APR-ranked",
    "bounded grid",
    "grid levels",
    "health factor",
    "liquidation alert",
    "range management",
    "rebalancing",
    "yield routing",
  ],
  market: ["PancakeSwap", "PancakeSwap V3", "Uniswap", "Thena"],
  position: ["collateral", "lending position", "LP position", "liquidity range"],
  protocol: ["Aave", "Lista", "Morpho", "PancakeSwap", "Venus"],
} as const;

const categoryFactKeys: Readonly<Record<CategorySlug, readonly CategoryFact["key"][]>> = {
  "grid-trading": ["market", "asset", "behavior", "service"],
  "health-factor-monitoring": ["protocol", "position", "behavior", "service"],
  "liquidity-rebalancing": ["protocol", "market", "position", "behavior", "service"],
  "yield-optimisation": ["protocol", "asset", "behavior", "service"],
};

function isRecord(value: Json | undefined): value is Readonly<Record<string, Json | undefined>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringsFromJson(value: Json | undefined): readonly string[] {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(stringsFromJson);
  }

  if (!isRecord(value)) {
    return [];
  }

  return [value.name, value.label, value.id].flatMap(stringsFromJson);
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function resolveDeclaredCategory(value: string): CategorySlug | null {
  const normalized = normalizeLabel(value);

  return (
    categoryTaxonomy.find(
      (definition) =>
        normalizeLabel(definition.slug) === normalized ||
        definition.aliases.some((alias) => normalizeLabel(alias) === normalized),
    )?.slug ?? null
  );
}

const declaredCategoryFields = [
  "category",
  "categories",
  "domains",
  "tags",
  "capabilities",
] as const;

export function extractRawDeclaredCategoryLabels(
  metadata: Readonly<Record<string, unknown>>,
): readonly string[] {
  return [
    ...new Set(
      declaredCategoryFields.flatMap((field) =>
        stringsFromJson(metadata[field] as Json | undefined),
      ),
    ),
  ];
}

export function extractDeclaredCategoryLabels(
  metadata: Readonly<Record<string, unknown>>,
): readonly string[] {
  return [
    ...new Set(
      extractRawDeclaredCategoryLabels(metadata).filter((label) =>
        Boolean(resolveDeclaredCategory(label)),
      ),
    ),
  ];
}

/**
 * True when the agent declared at least one category-like value and none of the
 * declared values map to a supported Sift category. Used for the read-time
 * "Other" badge; it is never persisted as category evidence.
 */
export function hasOffTaxonomyDeclaration(
  rawLabels: readonly string[],
): boolean {
  const meaningful = rawLabels
    .map((label) => label.trim())
    .filter((label) => label.length > 0);

  return (
    meaningful.length > 0 &&
    meaningful.every((label) => resolveDeclaredCategory(label) === null)
  );
}

function serviceCategoryDeclarations(
  services: readonly ClassificationService[],
): readonly string[] {
  return services.flatMap((service) =>
    isRecord(service.metadata)
      ? extractDeclaredCategoryLabels(service.metadata)
      : [],
  );
}

function classificationFields(input: CategoryClassificationInput): readonly Readonly<{
  field: string;
  value: string;
}>[] {
  const fields = [
    input.name ? { field: "agent.name", value: input.name } : null,
    input.description
      ? { field: "agent.description", value: input.description }
      : null,
    ...input.services.flatMap((service, index) => [
      { field: `services[${index}].type`, value: service.serviceType },
      ...(isRecord(service.metadata)
        ? Object.entries(service.metadata).flatMap(([key, value]) =>
            stringsFromJson(value).map((item) => ({
              field: `services[${index}].metadata.${key}`,
              value: item,
            })),
          )
        : []),
    ]),
  ];

  return fields.filter(
    (field): field is Readonly<{ field: string; value: string }> => field !== null,
  );
}

function exactPhrasePattern(value: string): RegExp {
  return new RegExp(`(^|[^a-z0-9])${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:s)?([^a-z0-9]|$)`, "i");
}

function collectFacts(
  category: CategorySlug,
  fields: ReturnType<typeof classificationFields>,
  services: readonly ClassificationService[],
): readonly CategoryFact[] {
  const allowedKeys = new Set(categoryFactKeys[category]);
  const facts: CategoryFact[] = [];

  for (const [key, values] of Object.entries(factDictionaries) as readonly [
    Exclude<CategoryFact["key"], "service">,
    readonly string[],
  ][]) {
    if (!allowedKeys.has(key)) continue;

    for (const value of values) {
      const match = fields.find((field) => exactPhrasePattern(value).test(field.value));
      if (match) {
        facts.push({
          key,
          label: key.charAt(0).toUpperCase() + key.slice(1),
          sourceField: match.field,
          value,
        });
      }
    }
  }

  if (allowedKeys.has("service")) {
    for (const [index, service] of services.entries()) {
      facts.push({
        key: "service",
        label: "Listed service",
        sourceField: `services[${index}].type`,
        value: service.serviceType,
      });
    }
  }

  const unique = new Map(
    facts.map((fact) => [`${fact.key}:${normalizeLabel(fact.value)}`, fact]),
  );
  return [...unique.values()].slice(0, 12);
}

export function classifyAgentCategories(
  input: CategoryClassificationInput,
): readonly CategoryEvidence[] {
  if (Number.isNaN(Date.parse(input.observedAt))) {
    throw new TypeError("Category observation time must be a valid timestamp.");
  }

  const declared = new Set(
    [
      ...(input.declaredCategories ?? []),
      ...serviceCategoryDeclarations(input.services),
    ].flatMap((value) => {
      const category = resolveDeclaredCategory(value);
      return category ? [category] : [];
    }),
  );
  const fields = classificationFields(input);
  const results: CategoryEvidence[] = [];

  for (const definition of categoryTaxonomy) {
    if (declared.has(definition.slug)) {
      results.push({
        category: definition.slug,
        confidence: 1,
        facts: collectFacts(definition.slug, fields, input.services),
        matchedTerms: ["explicit category declaration"],
        observedAt: input.observedAt,
        ruleVersion: CATEGORY_TAXONOMY_VERSION,
        source: "declared-metadata",
      });
      continue;
    }

    const matches = definition.inferencePatterns.flatMap(({ label, pattern }) =>
      fields.some(({ value }) => pattern.test(value)) ? [label] : [],
    );

    if (matches.length === 0) continue;

    results.push({
      category: definition.slug,
      confidence: 0.65,
      facts: collectFacts(definition.slug, fields, input.services),
      matchedTerms: [...new Set(matches)],
      observedAt: input.observedAt,
      ruleVersion: CATEGORY_TAXONOMY_VERSION,
      source: "deterministic-rule",
    });
  }

  return results;
}

export function getCategoryDefinition(category: CategorySlug): TaxonomyDefinition {
  const definition = categoryTaxonomy.find((candidate) => candidate.slug === category);

  if (!definition) {
    throw new TypeError("Unsupported Sift category.");
  }

  return definition;
}
