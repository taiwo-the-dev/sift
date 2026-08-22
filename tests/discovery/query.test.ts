import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildDiscoveryHref,
  extractDiscoverySearchTerms,
  inferDiscoveryCategory,
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
      metadata: ["valid", "invalid", "invented"],
      page: "7",
      q: "  grid   trading  ",
      size: "24",
      sort: "name-asc",
    });

    assert.equal(query.query, "grid trading");
    assert.deepEqual(query.categories, ["grid-trading"]);
    assert.deepEqual(query.effectiveCategories, ["grid-trading"]);
    assert.deepEqual(query.metadataStatuses, ["valid", "invalid"]);
    assert.equal(query.page, 7);
    assert.equal(query.pageSize, 24);
    assert.equal(query.sort, "name-asc");
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
      q: ["first query", "ignored query"],
      size: "1000",
      sort: "highest-reputation",
    });

    assert.equal(query.page, 1);
    assert.equal(query.pageSize, 12);
    assert.equal(query.query, "first query");
    assert.equal(query.sort, "relevance");
  });

  it("serializes shareable combined state with repeated filters", () => {
    const query = parseDiscoverySearchParams({
      category: ["yield-optimisation", "grid-trading"],
      metadata: "valid",
      q: "yield",
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
    assert.equal(url.searchParams.get("sort"), "recent");
    assert.equal(url.searchParams.get("size"), "24");
    assert.equal(url.searchParams.get("page"), "3");
  });
});
