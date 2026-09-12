import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDiscoveryHref,
  extractDiscoverySearchTerms,
  inferDiscoveryCategory,
  isReadyAvailabilityQuery,
  parseDiscoverySearchParams,
} from "../../features/discovery/query";

describe("discovery intent mapping", () => {
  it("maps all four required natural-language goals deterministically", () => {
    assert.equal(
      inferDiscoveryCategory("I want to earn yield on USDT"),
      "yield-optimisation",
    );
    assert.equal(
      inferDiscoveryCategory("Run grid trades inside a price range"),
      "grid-trading",
    );
    assert.equal(
      inferDiscoveryCategory("Protect my loan from liquidation"),
      "health-factor-monitoring",
    );
    assert.equal(
      inferDiscoveryCategory("Rebalance my LP liquidity"),
      "liquidity-rebalancing",
    );
  });

  it("does not invent an intent when no supported keyword exists", () => {
    assert.equal(inferDiscoveryCategory("summarise a legal document"), null);
  });

  it("extracts bounded search terms and removes generic goal words", () => {
    assert.deepEqual(
      extractDiscoverySearchTerms("Please help me find an AI agent for USDT yield"),
      ["find", "usdt", "yield"],
    );
  });
});

describe("discovery query parsing", () => {
  it("validates combined filters, page size, sorting and pagination", () => {
    const query = parseDiscoverySearchParams({
      category: ["grid-trading", "not-a-category", "grid-trading"],
      health: ["online", "offline", "invented", "online"],
      metadata: ["valid", "invalid", "invented"],
      network: "bsc-testnet",
      page: "7",
      q: "  grid   trading  ",
      rating: ["excellent", "fair", "invented", "excellent"],
      registered: "week",
      size: "24",
      sort: "score-desc",
    });

    assert.equal(query.query, "grid trading");
    assert.deepEqual(query.categories, ["grid-trading"]);
    assert.deepEqual(query.effectiveCategories, ["grid-trading"]);
    assert.deepEqual(query.metadataStatuses, ["valid", "invalid"]);
    assert.deepEqual(query.healthStatuses, ["online", "offline"]);
    assert.deepEqual(query.scoreBands, ["excellent", "fair"]);
    assert.equal(query.registrationPeriod, "week");
    assert.equal(query.network, "bsc-testnet");
    assert.deepEqual(query.networkChainIds, [97]);
    assert.equal(query.page, 7);
    assert.equal(query.pageSize, 24);
    assert.equal(query.sort, "score-desc");
  });

  it("uses the mapped intent only when no explicit category overrides it", () => {
    const inferred = parseDiscoverySearchParams({ q: "earn yield" });
    const explicit = parseDiscoverySearchParams({
      category: "grid-trading",
      q: "earn yield",
    });

    assert.deepEqual(inferred.effectiveCategories, ["yield-optimisation"]);
    assert.deepEqual(explicit.effectiveCategories, ["grid-trading"]);
  });

  it("normalizes unsupported and unbounded URL state", () => {
    const query = parseDiscoverySearchParams({
      page: "-4",
      network: "not-a-network",
      q: ["first query", "ignored query"],
      size: "1000",
      sort: "highest-reputation",
    });

    assert.equal(query.page, 1);
    assert.equal(query.pageSize, 12);
    assert.equal(query.query, "first query");
    assert.equal(query.network, "bsc-mainnet");
    assert.deepEqual(query.networkChainIds, [56]);
    assert.equal(query.sort, "relevance");
  });

  it("accepts the extended catalogue sort options", () => {
    assert.equal(
      parseDiscoverySearchParams({ sort: "profile-first" }).sort,
      "profile-first",
    );
    assert.equal(
      parseDiscoverySearchParams({ sort: "name-desc" }).sort,
      "name-desc",
    );
    for (const sort of [
      "score-desc",
      "score-asc",
      "available-first",
      "health-recent",
      "services-desc",
    ] as const) {
      assert.equal(parseDiscoverySearchParams({ sort }).sort, sort);
    }
  });

  it("serializes shareable combined state with repeated filters", () => {
    const query = parseDiscoverySearchParams({
      category: ["yield-optimisation", "grid-trading"],
      metadata: "valid",
      health: ["degraded", "unknown"],
      network: "bsc-testnet",
      q: "yield",
      rating: ["good", "excellent"],
      registered: "month",
      size: "24",
    });
    const href = buildDiscoveryHref(query, { page: 3, sort: "recent" });
    const url = new URL(href, "https://sift.example");

    assert.equal(url.pathname, "/discover");
    assert.equal(url.searchParams.get("q"), "yield");
    assert.deepEqual(url.searchParams.getAll("category"), [
      "yield-optimisation",
      "grid-trading",
    ]);
    assert.deepEqual(url.searchParams.getAll("metadata"), ["valid"]);
    assert.deepEqual(url.searchParams.getAll("health"), [
      "degraded",
      "unknown",
    ]);
    assert.deepEqual(url.searchParams.getAll("rating"), ["good", "excellent"]);
    assert.equal(url.searchParams.get("registered"), "month");
    assert.equal(url.searchParams.get("network"), "bsc-testnet");
    assert.equal(url.searchParams.get("sort"), "recent");
    assert.equal(url.searchParams.get("size"), "24");
    assert.equal(url.searchParams.get("page"), "3");
  });

  it("keeps BSC mainnet as the clean default judge journey", () => {
    const query = parseDiscoverySearchParams({});

    assert.equal(query.network, "bsc-mainnet");
    assert.deepEqual(query.networkChainIds, [56]);
    assert.deepEqual(query.healthStatuses, []);
    assert.equal(buildDiscoveryHref(query), "/discover");
  });

  it("uses a valid persisted network when the URL does not override it", () => {
    const query = parseDiscoverySearchParams({}, "bsc-testnet");

    assert.equal(query.network, "bsc-testnet");
    assert.deepEqual(query.networkChainIds, [97]);
  });

  it("uses an explicit evidence-based task availability filter", () => {
    const availabilityQuery = parseDiscoverySearchParams({
      availability: "ready",
    });

    assert.equal(isReadyAvailabilityQuery(availabilityQuery), true);
    assert.deepEqual(availabilityQuery.searchTerms, []);
    assert.equal(
      new URL(buildDiscoveryHref(availabilityQuery), "https://sift.example")
        .searchParams.get("availability"),
      "ready",
    );
    assert.equal(
      isReadyAvailabilityQuery(parseDiscoverySearchParams({ q: "ERC-8183" })),
      false,
    );
  });
});
