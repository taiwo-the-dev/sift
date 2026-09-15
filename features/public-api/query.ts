import {
  discoveryCategorySlugs,
  discoveryHealthStatuses,
  discoveryMetadataStatuses,
  discoveryPageSizes,
  discoveryRegistrationPeriods,
  discoveryScoreBands,
  discoverySortOptions,
  type DiscoveryQuery,
} from "@/features/discovery/model";
import { parseDiscoverySearchParams } from "@/features/discovery/query";

const supportedParameters = new Set([
  "availability",
  "category",
  "chainId",
  "health",
  "limit",
  "page",
  "profileStatus",
  "q",
  "rating",
  "registered",
  "sort",
]);

export class PublicApiQueryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicApiQueryError";
  }
}

function oneValue(params: URLSearchParams, key: string): string | undefined {
  const values = params.getAll(key);

  if (values.length > 1) {
    throw new PublicApiQueryError(`Use ${key} only once.`);
  }

  return values[0]?.trim() || undefined;
}

function listValues(params: URLSearchParams, key: string): readonly string[] {
  return params
    .getAll(key)
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function requireSupported(
  key: string,
  values: readonly string[],
  supported: readonly string[],
): void {
  const unsupported = values.find((value) => !supported.includes(value));

  if (unsupported) {
    throw new PublicApiQueryError(
      `Unsupported ${key} value "${unsupported}". Use: ${supported.join(", ")}.`,
    );
  }
}

function positiveInteger(
  value: string | undefined,
  key: string,
  maximum: number,
): string | undefined {
  if (value === undefined) return undefined;

  if (!/^\d+$/.test(value)) {
    throw new PublicApiQueryError(`${key} must be a positive integer.`);
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maximum) {
    throw new PublicApiQueryError(`${key} must be between 1 and ${maximum}.`);
  }

  return String(parsed);
}

export function parsePublicAgentQuery(url: URL): DiscoveryQuery {
  for (const key of url.searchParams.keys()) {
    if (!supportedParameters.has(key)) {
      throw new PublicApiQueryError(`Unsupported query parameter "${key}".`);
    }
  }

  const query = oneValue(url.searchParams, "q");
  if (query && query.length > 180) {
    throw new PublicApiQueryError("q must contain 180 characters or fewer.");
  }

  const chainId = oneValue(url.searchParams, "chainId") ?? "56";
  if (chainId !== "56" && chainId !== "97") {
    throw new PublicApiQueryError("chainId must be 56 or 97.");
  }

  const categories = listValues(url.searchParams, "category");
  const health = listValues(url.searchParams, "health");
  const profileStatuses = listValues(url.searchParams, "profileStatus");
  const ratings = listValues(url.searchParams, "rating");
  const sort = oneValue(url.searchParams, "sort");
  const registered = oneValue(url.searchParams, "registered");
  const availability = oneValue(url.searchParams, "availability");

  requireSupported("category", categories, discoveryCategorySlugs);
  requireSupported(
    "health",
    health,
    discoveryHealthStatuses.map((status) => status.value),
  );
  requireSupported(
    "profileStatus",
    profileStatuses,
    discoveryMetadataStatuses.map((status) => status.value),
  );
  requireSupported(
    "rating",
    ratings,
    discoveryScoreBands.map((band) => band.value),
  );
  if (sort) {
    requireSupported(
      "sort",
      [sort],
      discoverySortOptions.map((option) => option.value),
    );
  }
  if (registered) {
    requireSupported(
      "registered",
      [registered],
      discoveryRegistrationPeriods.map((period) => period.value),
    );
  }
  if (availability && availability !== "ready") {
    throw new PublicApiQueryError('availability must be "ready" when supplied.');
  }

  const limit = positiveInteger(
    oneValue(url.searchParams, "limit"),
    "limit",
    Math.max(...discoveryPageSizes),
  );
  if (
    limit &&
    !discoveryPageSizes.some((pageSize) => pageSize === Number(limit))
  ) {
    throw new PublicApiQueryError(
      `limit must be one of: ${discoveryPageSizes.join(", ")}.`,
    );
  }

  return parseDiscoverySearchParams({
    availability,
    category: [...categories],
    health: [...health],
    metadata: [...profileStatuses],
    network: chainId === "97" ? "bsc-testnet" : "bsc-mainnet",
    page: positiveInteger(oneValue(url.searchParams, "page"), "page", 10_000),
    q: query,
    rating: [...ratings],
    registered,
    size: limit,
    sort,
  });
}
